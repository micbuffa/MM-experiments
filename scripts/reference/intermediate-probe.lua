-- Intermediate Race survey in MAME 0.271 with the local Marble set.
local machine = manager.machine
local mem = machine.devices[':maincpu'].spaces.program
local coin = machine.ioport.ports[':1820']:field(1)
local start = machine.ioport.ports[':F60000']:field(2)
local frame = 0
local route = {{280,140}, {300,196}, {310,228}, {315,288}, {332,360}, {376,390},
  {402,438}, {481,439}, {487,526}, {590,527}, {591,580}}
local intermediateRoute = {{210,130}, {175,164}, {158,192}, {132,205}, {126,255},
  {152,286}, {220,289}, {291,284}, {360,284}, {380,320}, {395,356}, {425,405}, {445,427}}
local impactReplay = os.getenv('MARBLE_TERRAIN_AXIS') == 'intermediate-impact'
local impactRoute = {{307,334}}
local controllers = {{waypoint=1,x=0,z=0}, {waypoint=1,x=0,z=0}}
local captures = {[2490]=true,[2850]=true,[3060]=true,[3077]=true,[3100]=true,
  [3206]=true,[3214]=true,[3230]=true,[3250]=true,[3300]=true,[3375]=true}
local tap = mem:install_read_tap(0xf20000, 0xf20007, 'duo_replay', function(address,value)
  local port = (address - 0xf20000) // 2
  local c = controllers[port // 2 + 1]
  return (value & 0xff00) | ((port % 2 == 0 and c.x or c.z) & 255)
end)
local function steer(distance, speed)
  return math.floor(math.max(-30, math.min(30, distance * 1.3 - speed * 12)) + 0.5)
end
local output = assert(os.getenv('MARBLE_TERRAIN_OUTPUT'))
local outputs = assert(io.open(output .. '/intermediate-pose.csv', 'w'))
outputs:write('frame,player,level,mode,animation,x,z,height,waypoint,scroll\n')
local previous = ''
local sample = assert(loadfile(os.getenv('MARBLE_TERRAIN_DECODER')))()
local exported=false
local function survey()
  local desc=mem:read_u32(0x400474)
  local n=mem:read_u16(desc+0x18)
  print('LEVEL_TERRAIN',string.format('%x',desc),n,mem:read_i16(0x40097e))
  local out=assert(io.open(output .. '/intermediate-terrain.json', 'w'))
  out:write('{"format":"intermediate-terrain-v1","rows":[\n')
  local max=(n+20+22)//2
  for z=0,max do
    local row={}
    for x=0,max do
      local h={0,0,0,0}
      if math.abs(x-z)<=21 then
        local w=sample(mem,x,z)
        h={w[14],w[9],w[8],w[5]}
      end
      row[#row+1]=string.format('[%d,%d,%d,%d]',table.unpack(h))
    end
    out:write('['..table.concat(row,',')..']'..(z==max and '\n' or ',\n'))
  end
  out:write(']}');out:close()
end

local screen=machine.screens[':screen']
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



emu.register_frame_done(function()
  frame = frame+1
  if frame==700 or frame==720 then coin:set_value(1) end
  if frame==708 or frame==728 then coin:set_value(0) end
  if frame==740 then start:set_value(1) end
  if frame==748 then start:set_value(0) end
  if frame<1199 then return end
  local level = mem:read_u32(0x400474)
  local mode = mem:read_u16(0x400390)
  local animation = {}
  if level==0x2c54c then
    route=impactReplay and frame>=2940 and impactRoute or intermediateRoute
    if impactReplay and frame==2940 then
      for _,c in ipairs(controllers) do c.waypoint=1 end
    end
    if mode==0 and not controllers[1].reset then
      for _,c in ipairs(controllers) do c.waypoint=1;c.reset=true end
    end
  end
  for i,c in ipairs(controllers) do
    local base = 0x400000 + (i-1)*0xe2
    local x = mem:read_i32(base+0x24)/65536
    local z = mem:read_i32(base+0x28)/65536
    local y = mem:read_u32(base+0x2c)/65536
    animation[i] = mem:read_u8(base+0x32)
    if frame%2==0 and frame>=(i==1 and 1200 or 1250) and animation[i]==0 and mode==0 then
      local target = route[c.waypoint]
      if target and (x-target[1])^2+(z-target[2])^2 < 12^2 then
        c.waypoint=c.waypoint+1
        target=route[c.waypoint]
      end
      if target then
        c.x=c.x+steer(target[1]-x,mem:read_i32(base+0x18)/65536)
        c.z=c.z-steer(target[2]-z,mem:read_i32(base+0x1c)/65536)
      end
    end
    outputs:write(string.format('%d,%d,%x,%d,%d,%.3f,%.3f,%.3f,%d,%d\n',
      frame,i,level,mode,animation[i],x,z,y,c.waypoint,mem:read_i16(0x40097e)))
  end
  if level==0x2c54c then
    if mode==0 and not exported then survey(); exported=true end
    if impactReplay then
      if frame>=3080 and frame<=3230 and frame%5==0 then capture() end
    elseif captures[frame] or (frame>=3075 and frame<=3275 and frame%5==0) then
      capture()
    end
  end
  local status=string.format('%x %d %d %d', level,mode,animation[1],animation[2])
  if status~=previous then print(frame,status); previous=status end
  if frame>=(impactReplay and 3300 or 3650) then
    assert(exported, 'Intermediate Race survey was not reached')
    outputs:close();tap:remove();machine:exit()
  end
end, 'frame')
