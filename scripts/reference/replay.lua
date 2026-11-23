-- Diagnostic MAME 0.271 uniquement ; sequence et phaseShift injectes par le lanceur.

local screen=manager.machine.screens[':screen']
local space=manager.machine.devices[':maincpu'].spaces['program']
local coin=manager.machine.ioport.ports[':1820']:field(1)
local start=manager.machine.ioport.ports[':F60000']:field(1)
local completed=0
local readcount=0
local verified=0
local tap=space:install_read_tap(0xf20000,0xf20007,'marble_reference_ports',function(address,data,mask)
 assert(mask==255, "Unexpected read mask")
 local frame=completed+1-phaseShift
 local port=math.floor((address-0xf20000)/2)
 local value=0
 if sequence[frame] then value=sequence[frame][port] or 0 end
 if frame>=1198 and frame<=1213 then
  readcount=readcount+1
  print(string.format('REF_READ %d %d %d %d %d %d',completed,screen:frame_number(),address,mask,data,value))
 end
 return (data & 0xff00) | value
end)
local verification=space:install_read_tap(0xf20000,0xf20007,'marble_reference_verify',function(address,data,mask)
 local frame=completed+1-phaseShift
 local port=math.floor((address-0xf20000)/2)
 local expected=sequence[frame] and sequence[frame][port] or 0
 assert(mask==255 and (data & 255)==expected, 'Replay verification failed')
 if frame>=1198 and frame<=1213 then verified=verified+1 end
end)
local function locate()
 local pixels,w,h=screen:pixels()
 local n,sx,sy=0,0,0
 local xmin,xmax,ymin,ymax=w,0,h,0
 for y=math.floor(h*0.12),math.ceil(h*0.8)-1 do
  for x=math.floor(w*0.1),math.ceil(w*0.9)-1 do
   local color=string.unpack('<I4',pixels,(y*w+x)*4+1)
   local r,g,b=(color>>16)&255,(color>>8)&255,color&255
   if b>100 and b>r*1.5+30 and b>g*1.3+20 then
    n=n+1;sx=sx+x;sy=sy+y;xmin=math.min(xmin,x);xmax=math.max(xmax,x);ymin=math.min(ymin,y);ymax=math.max(ymax,y)
   end
  end
 end
 if n>0 then print(string.format('REF_POSITION %d %d %d %.9f %.9f %d %d %d %d %d',completed-1,w,h,sx/n,sy/n,n,xmin,ymin,xmax,ymax))
 else print('REF_NO_MARKER',completed-1) end
end
emu.register_frame_done(function()
 completed=completed+1
 local before=completed-1
 if completed==700 then coin:set_value(1) end
 if completed==708 then coin:set_value(0) end
 if completed==710 then start:set_value(1) end
 if completed==718 then start:set_value(0) end
 if before==1199 or before==1206 or before==1212 then locate() end
 if before>=1214 then
  verification:remove();tap:remove();coin:clear_value();start:clear_value()
  print(string.format('REF_COMPLETE %s %d %d',emu.app_version(),readcount,verified))
  manager.machine:exit()
 end
end,'frame')
