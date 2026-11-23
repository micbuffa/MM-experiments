-- Terrain lookups from Marble Love revision 113cf5d, independently checked
-- against the 16-word output of the original 68010 routine in MAME.
local function sampleCell(memory, x, y)
  local level = memory:read_u32(0x400474)
  local result = {}
  local diagonal = y + x - 20
  local column = 21 - x + (diagonal // 2)
  local steps = 0x24b3a + (diagonal & 1) * 18
  local out = 0
  for i = 0, 3 do
    local heights = {0,0,0,0}
    if diagonal >= 0 and diagonal < memory:read_u16(level + 0x18) then
      local slot = column + (diagonal & 1) * 22
      if slot >= 0 and slot < 44 then
        local addr = 0xa00000 + memory:read_i16(0x1eb3a + (diagonal & 0xfe))
          + memory:read_u8(0x1ed0a + slot) - 2
        local shift = memory:read_u8(0x1ed36 + slot)
        local index = (memory:read_u32(addr) >> shift) & 0x7fe
        local code = memory:readv_u16(memory:read_u32(0x40065a) + index)
        local depth = 0
        while code >= 0x800 and code < 0x1000 do
          depth = depth + 1
          assert(depth <= 8, 'Cyclic terrain code')
          code = memory:read_u16(0x40076e + (code & 0x7fe))
        end
        local base = memory:read_u16(0x400478 + diagonal * 2)
        if code >= 0x1000 then
          local height = (base + (code & 0x7f) - 0x40) & 0xffff
          local coefficient = memory:read_i16(0x1ed62 + ((code >> 6) & 0x3e))
          local other = coefficient == 0x1000 and 0 or (height - coefficient) & 0xffff
          for j=1,4 do
            heights[j] = (code >= 0xf000 or code & (1 << (11+j)) ~= 0) and height or other
          end
        elseif code ~= 0 then
          local record = memory:read_u32(level) + code
          for j=1,4 do
            local byte = memory:readv_u8(record + j - 1)
            heights[j] = byte ~= 0 and (base - 0x80 + byte) & 0xffff or 0
          end
        end
      end
    end
    assert(out >= 0 and out <= 12 and out % 4 == 0)
    for j=1,4 do result[out+j] = heights[j] end
    if i < 3 then
      column = column + memory:read_i16(steps)
      diagonal = diagonal + memory:read_i16(steps + 2)
      out = out + 4 + memory:read_i16(steps + 4) // 2
      steps = steps + 6
    end
  end
  return result
end

return sampleCell
