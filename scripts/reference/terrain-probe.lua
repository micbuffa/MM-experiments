-- Marble set 1, MAME 0.271. Only the trackball input ports are overridden.
local machine = manager.machine
local memory = machine.devices[':maincpu'].spaces.program
local screen = machine.screens[':screen']
local coin = machine.ioport.ports[':1820']:field(1)
local start = machine.ioport.ports[':F60000']:field(1)
local axis = assert(os.getenv('MARBLE_TERRAIN_AXIS'))
assert(axis == 'x' or axis == 'y' or axis == 'scroll' or axis == 'finish', 'Expected replay axis x, y, scroll or finish')
local output = assert(os.getenv('MARBLE_TERRAIN_OUTPUT'))
local decoderPath = assert(os.getenv('MARBLE_TERRAIN_DECODER'))
local sampleCell = assert(loadfile(decoderPath))()
local frame = 0
local reads = 0
local checkpoints = { [1199] = true, [1250] = true, [1260] = true, [1280] = true,
  [1310] = true, [1320] = true, [1340] = true }
local scrollImages = { [1199] = true, [1407] = true, [1417] = true,
  [1427] = true, [1437] = true, [1455] = true }
local scrollSurveys = { [1199] = true, [1399] = true, [1450] = true,
  [1500] = true, [1630] = true }
local finishSurveys = { [1199] = true, [1500] = true, [1740] = true, [1860] = true, [1920] = true }
local waypoints = { {280,140}, {300,196}, {310,228}, {315,288}, {332,360}, {376,390},
  {402,438}, {481,439}, {487,526}, {590,527}, {591,580} }
local trackball = {0, 0}
local waypoint = 1
local maxScroll = -16144
local tap = memory:install_read_tap(0xf20000, 0xf20007, 'terrain_replay', function(address, value, mask)
  assert(mask == 255, 'Unexpected trackball read mask')
  local port = (address - 0xf20000) // 2
  local step = math.max(0, frame - 1199)
  if axis == 'finish' then
    if port < 2 and step > 0 then reads = reads + 1 end
    return (value & 0xff00) | (trackball[port+1] or 0)
  end
  if axis == 'scroll' then
    local delta = port == 0 and 12 or (port == 1 and -8 or 0)
    if delta ~= 0 and step > 0 then reads = reads + 1 end
    return (value & 0xff00) | ((step * delta) & 0xff)
  end
  local moving = port == (axis == 'x' and 0 or 1)
  if moving and step > 0 then reads = reads + 1 end
  return (value & 0xff00) | (moving and (step * 12) & 0xff or 0)
end)

local function capture()
  local path = string.format('%s/%04d.ppm', output, frame)
  local pixels, width, height = screen:pixels()
  local file = assert(io.open(path, 'wb'))
  file:write(string.format('P6\n%d %d\n255\n', width, height))
  local row = {}
  for y = 0, height - 1 do
    for x = 0, width - 1 do
      local color = string.unpack('<I4', pixels, (y * width + x) * 4 + 1)
      row[x + 1] = string.char((color >> 16) & 255, (color >> 8) & 255, color & 255)
    end
    file:write(table.concat(row))
  end
  file:close()
end

local function saveSurvey(path, lastColumn, lastRow, complete)
  local file = assert(io.open(output .. '/' .. path, 'w'))
  file:write(string.format('{"format":"practice-terrain-v%d","rows":[\n', complete and 2 or 1))
  local firstColumn = complete and 0 or 10
  local firstRow = complete and 0 or 11
  for row = firstRow, lastRow do
    local cells = {}
    for col = firstColumn, lastColumn do
      if complete and math.abs(row - col) > 21 then
        -- Outside the horizontal view, the repeated playfield aliases other tiles.
        cells[#cells + 1] = '[0,0,0,0]'
      else
        local words = sampleCell(memory, col, row)
        cells[#cells + 1] = string.format('[%d,%d,%d,%d]', words[14], words[9], words[8], words[5])
      end
    end
    file:write('[' .. table.concat(cells, ',') .. ']' .. (row < lastRow and ',' or '') .. '\n')
  end
  file:write(']}\n')
  file:close()
end

local function finish()
  assert(reads > 0, 'No reads of the replayed trackball axis')
  print(string.format('TERRAIN_COMPLETE %s %d', emu.app_version(), reads))
  coin:clear_value()
  start:clear_value()
  tap:remove()
  machine:exit()
end

local function steer(distance, speed)
  return math.floor(math.max(-30, math.min(30, distance * 1.3 - speed * 12)) + 0.5)
end

local function replayFinish()
  if frame < 1199 then return end
  local level = memory:read_u32(0x400474)
  if level ~= 0x2bee2 then
    assert(level == 0x2c54c, 'The replay did not reach Intermediate Race')
    print(string.format('TERRAIN_NEXT %d %06x %d', frame, level, maxScroll))
    finish()
    return
  end

  local x = memory:read_i32(0x400024) / 65536
  local z = memory:read_i32(0x400028) / 65536
  local scroll = memory:read_i16(0x40097e)
  maxScroll = math.max(maxScroll, scroll)
  if finishSurveys[frame] then
    saveSurvey(string.format('grid-%d.json', frame), 90, 90, true)
    print(string.format('TERRAIN_FINISH_SAMPLE %d %.1f %.1f %d %d',
      frame, x, z, scroll, memory:read_u8(0x400032)))
    capture()
  end
  if frame % 2 ~= 0 then return end
  local target = waypoints[waypoint]
  if target and (x-target[1])^2 + (z-target[2])^2 < 12^2 then
    waypoint = waypoint + 1
    target = waypoints[waypoint]
  end
  if not target then return end
  local vx = memory:read_i32(0x400018) / 65536
  local vz = memory:read_i32(0x40001c) / 65536
  trackball[1] = (trackball[1] + steer(target[1]-x, vx)) & 255
  trackball[2] = (trackball[2] - steer(target[2]-z, vz)) & 255
end

emu.register_frame_done(function()
  frame = frame + 1
  if frame == 700 then coin:set_value(1) end
  if frame == 708 then coin:set_value(0) end
  if frame == 710 then start:set_value(1) end
  if frame == 718 then start:set_value(0) end
  if axis == 'finish' then
    replayFinish()
    return
  end
  if axis == 'scroll' then
    if not scrollImages[frame] and not scrollSurveys[frame] then return end
    assert(memory:read_u32(0x400474) == 0x2bee2, 'Practice Race descriptor not loaded')
    if scrollSurveys[frame] then saveSurvey(string.format('grid-%d.json', frame), 47, 47) end
    if scrollImages[frame] then
      print(string.format('TERRAIN_SCROLL %d %d', frame, memory:read_i16(0x40097e)))
      capture()
    end
    if frame == 1630 then finish() end
    return
  end
  if not checkpoints[frame] then return end

  assert(memory:read_u32(0x400474) == 0x2bee2, 'Practice Race descriptor not loaded')
  if frame == 1199 then
    print('TERRAIN_LEVEL 02bee2')
    for index = 0, 5 do
      print(string.format('TERRAIN_DESCRIPTOR %d %06x', index + 1, memory:read_u32(0x2be00 + 4 * index)))
    end
  end
  local heights = {}
  for index = 0, 15 do
    heights[index + 1] = string.format('%04x', memory:read_u16(0x401c28 + 2 * index))
  end
  print(string.format('TERRAIN_SAMPLE %d %d %d %d %d %s', frame,
    memory:read_u16(0x400696), memory:read_u16(0x400698),
    memory:read_i16(0x400690), memory:read_i16(0x400692), table.concat(heights, ' ')))
  local x, y = memory:read_u16(0x400696), memory:read_u16(0x400698)
  print(string.format('TERRAIN_POSE %d %d %d %d', frame,
    memory:read_i16(0x400690), memory:read_i16(0x400692), memory:read_u16(0x400694)))
  local decoded = sampleCell(memory, x, y)
  for index = 1, 16 do
    assert(string.format('%04x', decoded[index]) == heights[index], 'Terrain decoder mismatch')
  end
  if frame == 1199 then saveSurvey('practice-terrain.json', 29, 24) end
  capture()
  if frame == 1340 then finish() end
end, 'frame')
