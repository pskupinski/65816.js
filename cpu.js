/*
 * Copyright (c) 2011, Preston Skupinski <skupinsk@cse.msu.edu>
 * 
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

function CPU_65816() {
  // Registers
  this.r = {
    a:0,   // Accumulator
    b:0,   // "Hidden" Accumulator Register(high byte in 8-bit mode)
    x:0,   // X Index Register
    y:0,   // Y Index Register
    d:0,   // Direct Page Register
    s:0,   // Stack Pointer
    pc:0,  // Program Counter
    dbr:0, // Data Bank Register
    pbr:0  // Program Bank Register
  };

  // P register flags. 
  this.p = {
    e:1, // Emulator                  (0 = native mode)
    c:0, // Carry                     (1 = carry)
    z:0, // Zero                      (1 = zero)
    i:0, // IRQ Disable               (1 = disabled)
    d:0, // Decimal Mode              (1 = decimal, 0 = binary)
    x:0, // Index Register Select     (1 = 8-bit, 0 = 16-bit)
    m:0, // Memory/Accumulator Select (1 = 8-bit, 0 = 16-bit)
    v:0, // Overflow                  (1 = overflow)
    n:0  // Negative                  (1 = negative)
  };
  
  this.mmu = MMU;
  this.mmu.cpu = this; 

  this.opcode_map = { 0xfb : XCE, 0x18 : CLC, 0x78 : SEI, 0x38 : SEC, 
                      0x58 : CLI, 0xc2 : REP, 0xe2 : SEP, 
                      0xa9 : LDA_const, 0xad : LDA_absolute, 
                      0xa5 : LDA_direct_page, 0xbd : LDA_absolute_indexed_x,
                      0xb9 : LDA_absolute_indexed_y, 0xa2 : LDX_const, 
                      0xae : LDX_absolute, 0xa6 : LDX_direct_page,
                      0xa0 : LDY_const, 0xbc : LDY_absolute_indexed_x,
                      0xb4 : LDY_direct_page_indexed_x,
                      0xbe : LDX_absolute_indexed_y,
                      0xb6 : LDX_direct_page_indexed_y,
                      0xac : LDY_absolute, 0xa4 : LDY_direct_page, 0xea : NOP,
                      0x8d : STA_absolute, 0x85 : STA_direct_page,
                      0x9d : STA_absolute_indexed_x, 
                      0x99 : STA_absolute_indexed_y,
                      0x95 : STA_direct_page_indexed_x, 
                      0x8e : STX_absolute, 0x86 : STX_direct_page,
                      0x96 : STX_direct_page_indexed_y,
                      0x8c : STY_absolute, 0x84 : STY_direct_page,
                      0x94 : STY_direct_page_indexed_x,
                      0x1a : INC_accumulator, 0xe6 : INC_direct_page,
                      0xee : INC_absolute, 0xe8 : INX, 0xc8 : INY,
                      0x9c : STZ_absolute, 0x64 : STZ_direct_page,
                      0x9e : STZ_absolute_indexed_x,
                      0x74 : STZ_direct_page_indexed_x };
}

var MMU = {
  cpu: {},
  memory: { 0: {} },

  read_byte: function(location) {
    return this.memory[cpu.r.dbr][location];
  },
 
  store_byte: function(location, b) {
    this.memory[cpu.r.dbr][location] = b;       
  },

  load_rom: function(raw_hex) {
    var loc = 0x8000;
    byte_buffer = [];
    for(var i = 0; i < raw_hex.length; i++) {
      byte_buffer.push(raw_hex[i]);
      if(byte_buffer.length===2) {
        this.store_byte(loc, parseInt(byte_buffer[0]+byte_buffer[1], "16")); 
        loc += 8; 
        byte_buffer = [];      
      } 
    }    
  }
};

var STZ_absolute = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.m===1) {
      cpu.mmu.store_byte(location, 0);
    } else {
      cpu.mmu.store_byte(location, 0);
      cpu.mmu.store_byte(location+1, 0); 
    } 
  }
};

var STZ_direct_page = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    var location = bytes[0]+cpu.p.d;
    if(cpu.p.m===1) {
      cpu.mmu.store_byte(location, 0);
    } else {
      cpu.mmu.store_byte(location, 0);
      cpu.mmu.store_byte(location+1, 0);
    }
  }
};

var STZ_absolute_indexed_x = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0])+cpu.r.x;
    if(cpu.p.m===1) {
      cpu.mmu.store_byte(location, 0);
    } else {
      cpu.mmu.store_byte(location, 0);
      cpu.mmu.store_byte(location+1, 0); 
    } 
  }
};

var STZ_direct_page_indexed_x = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    var location = bytes[0]+cpu.p.d+cpu.r.x;
    if(cpu.p.m===1) {
      cpu.mmu.store_byte(location, 0);
    } else {
      // Check for overflow.
      var overflow_check = location - 0xffff;
      if(overflow_check > 0) {
        location = overflow_check-1; 
      }
      cpu.mmu.store_byte(location, 0);
      // Check for potential overflow again.
      if(location===0xffff) {
       location = 0;
      } else {
        location++;
      }
      cpu.mmu.store_byte(location, 0);
    }
  }
};

var LDA_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d + cpu.r.x; 
    if(cpu.p.m===1) {
      cpu.r.a = cpu.mmu.read_byte(location);
    } else {
      // Check for overflow.
      var overflow_check = location - 0xffff;
      if(overflow_check > 0) {
        location = overflow_check-1; 
      }
      var high_byte = cpu.mmu.read_byte(location); 
      // Check for potential overflow again.
      if(location===0xffff) {
       location = 0;
      } else {
        location++;
      }
      var low_byte = cpu.mmu.read_byte(location);
      cpu.r.a = high_byte | low_byte;
    } 
    if(cpu.r.a===0) {
      cpu.p.z = 1;
    }
    // TODO: Set the n status bit of the p status register.
  }
};

var LDA_absolute_indexed_y = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0])+cpu.r.y;
    if(cpu.p.m===1) {
      cpu.r.a = cpu.mmu.read_byte(location);
    } else {
      var high_byte = cpu.mmu.read_byte(location); 
      var low_byte = cpu.mmu.read_byte(location+1);
      cpu.r.a = high_byte | low_byte;
    }
    if(cpu.r.a===0) {
      cpu.p.z = 1;
    }
    // TODO: Set the n status bit of the p status register.
  }
};

var LDA_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0])+cpu.r.x;
    if(cpu.p.m===1) {
      cpu.r.a = cpu.mmu.read_byte(location);
    } else {
      var high_byte = cpu.mmu.read_byte(location); 
      var low_byte = cpu.mmu.read_byte(location+1);
      cpu.r.a = high_byte | low_byte;
    }
    if(cpu.r.a===0) {
      cpu.p.z = 1;
    }
    // TODO: Set the n status bit of the p status register.
  }
};

var NOP = {
  bytes_required:function() {
    return 1; 
  },
  execute:function() {}
};

var LDY_const = {
  bytes_required:function(cpu) {
    if(cpu.p.x===0)
      return 3;
    else
      return 2;
  },
  execute:function(cpu, bytes) {
    if(cpu.p.x===1) {
      cpu.r.y = bytes[0]; 
    } else {
      cpu.r.y = (bytes[1]<<8)|bytes[0];
    }
    if(cpu.r.y===0) {
      cpu.p.z = 1;
    } 
    // TODO: set n bit in p status register
  }
};

var LDY_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0]) + cpu.r.x;
    if(cpu.p.m===1) {
      cpu.r.y = cpu.mmu.read_byte(location);
    } else {
      var high_byte = cpu.mmu.read_byte(location); 
      var low_byte = cpu.mmu.read_byte(location+1);
      cpu.r.y = high_byte | low_byte;
    }
    if(cpu.r.y===0) {
      cpu.p.z = 1; 
    }
    // TODO: set n bit in the p status register
  }
};

var LDY_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d + cpu.r.x; 
    if(cpu.p.m===1) {
      cpu.r.y = cpu.mmu.read_byte(location);
    } else {
      // Check for overflow.
      var overflow_check = location - 0xffff;
      if(overflow_check > 0) {
        location = overflow_check-1; 
      }
      var high_byte = cpu.mmu.read_byte(location); 
      // Check for potential overflow again.
      if(location===0xffff) {
       location = 0;
      } else {
        location++;
      }
      var low_byte = cpu.mmu.read_byte(location);
      cpu.r.y = high_byte | low_byte;
    } 
    if(cpu.r.a===0) {
      cpu.p.z = 1;
    }
    // TODO: Set the n status bit of the p status register.
  }
}

var LDY_absolute = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.m===1) {
      cpu.r.y = cpu.mmu.read_byte(location);
    } else {
      var high_byte = cpu.mmu.read_byte(location); 
      var low_byte = cpu.mmu.read_byte(location+1);
      cpu.r.y = high_byte | low_byte;
    }
    if(cpu.r.y===0) {
      cpu.p.z = 1; 
    }
    // TODO: set n bit in the p status register
  } 
};

var LDY_direct_page = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d; 
    if(cpu.p.m===1) {
      cpu.r.y = cpu.mmu.read_byte(location);
    } else {
      var high_byte = cpu.mmu.read_byte(location); 
      var low_byte = cpu.mmu.read_byte(location+1);
      cpu.r.y = high_byte | low_byte;
    } 
    if(cpu.r.a===0) {
      cpu.p.z = 1;
    }
    // TODO: Set the n status bit of the p status register.
  }
};

var INX = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.r.x++;
    if(cpu.r.x===0) {
      cpu.p.z = 1;
    }
    // TODO: set n bit of p status register
  }
};

var INY = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.r.y++;
    if(cpu.r.y===0) {
      cpu.p.z = 1;
    }
    // TODO: set n bit of p status register
  }
};

var INC_accumulator = {
  bytes_required: function() {
    return 1;
  },
  execute: function(cpu) {
    cpu.r.a++; 
    if(cpu.r.a===0) {
      cpu.p.z = 1;
    }
    // TODO: Set n bit of the p status register.
  } 
};

var INC_absolute = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0]
    var temp;
    if(cpu.p.m===1) {
      temp = cpu.mmu.read_byte(location) + 1; 
      cpu.mmu.store_byte(location, temp);
    } else {
      var high_byte = cpu.mmu.read_byte(location); 
      var low_byte = cpu.mmu.read_byte(location+1);
      temp = high_byte | low_byte;
      temp++;
      high_byte = temp & 0xFF00;
      low_byte = temp & 0x00FF;
      cpu.mmu.store_byte(location, low_byte);
      cpu.mmu.store_byte(location+1, high_byte);
    }
    if(temp===0) { 
      cpu.p.z = 1;
    }
    // TODO: Set n bit of the p status register.
  }
};

var INC_direct_page = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var temp;
    if(cpu.p.m===1) {
      temp = cpu.mmu.read_byte(location) + 1; 
      cpu.mmu.store_byte(location, temp);
    } else {
      var high_byte = cpu.mmu.read_byte(location); 
      var low_byte = cpu.mmu.read_byte(location+1);
      temp = high_byte | low_byte;
      temp++;
      high_byte = temp & 0xFF00;
      low_byte = temp & 0x00FF;
      cpu.mmu.store_byte(location, low_byte);
      cpu.mmu.store_byte(location+1, high_byte);
    }
    if(temp===0) { 
      cpu.p.z = 1;
    }
    // TODO: Set n bit of the p status register.
  }
};

var STA_direct_page_indexed_x = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    var location = bytes[0]+cpu.p.d+cpu.r.x;
    if(cpu.p.m===1) {
      cpu.mmu.store_byte(location, cpu.r.a);
    } else {
      var high_byte = cpu.r.a & 0xFF00;
      var low_byte = cpu.r.a & 0x00FF;
      // Check for overflow.
      var overflow_check = location - 0xffff;
      if(overflow_check > 0) {
        location = overflow_check-1; 
      }
      cpu.mmu.store_byte(location, low_byte);
      // Check for potential overflow again.
      if(location===0xffff) {
       location = 0;
      } else {
        location++;
      }
      cpu.mmu.store_byte(location, high_byte);
    }
  }
};

var STA_direct_page = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    var location = bytes[0]+cpu.p.d;
    if(cpu.p.m===1) {
      cpu.mmu.store_byte(location, cpu.r.a);
    } else {
      var high_byte = cpu.r.a & 0xFF00;
      var low_byte = cpu.r.a & 0x00FF;
      cpu.mmu.store_byte(location, low_byte);
      cpu.mmu.store_byte(location+1, high_byte);
    }
  }
};

var STA_absolute_indexed_x = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0])+cpu.r.x;
    if(cpu.p.m===1) {
      cpu.mmu.store_byte(location, cpu.r.a);
    } else {
      var high_byte = cpu.r.a & 0xFF00;
      var low_byte = cpu.r.a & 0x00FF;
      cpu.mmu.store_byte(location, low_byte);
      cpu.mmu.store_byte(location+1, high_byte); 
    } 
  }
};

var STA_absolute_indexed_y = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0])+cpu.r.y;
    if(cpu.p.m===1) {
      cpu.mmu.store_byte(location, cpu.r.a);
    } else {
      var high_byte = cpu.r.a & 0xFF00;
      var low_byte = cpu.r.a & 0x00FF;
      cpu.mmu.store_byte(location, low_byte);
      cpu.mmu.store_byte(location+1, high_byte); 
    } 
  }
};

var STY_direct_page_indexed_x = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    var location = bytes[0]+cpu.p.d+cpu.r.x;
    if(cpu.p.x===1) {
      cpu.mmu.store_byte(location, cpu.r.y);
    } else {
      var high_byte = cpu.r.y & 0xFF00;
      var low_byte = cpu.r.y & 0x00FF;
      // Check for overflow.
      var overflow_check = location - 0xffff;
      if(overflow_check > 0) {
        location = overflow_check-1; 
      }
      cpu.mmu.store_byte(location, low_byte);
      // Check for potential overflow again.
      if(location===0xffff) {
       location = 0;
      } else {
        location++;
      }
      cpu.mmu.store_byte(location, high_byte);
    }
  }
};

var STY_direct_page = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    var location = bytes[0]+cpu.p.d;
    if(cpu.p.x===1) {
      cpu.mmu.store_byte(location, cpu.r.y);
    } else {
      var high_byte = cpu.r.y & 0xFF00;
      var low_byte = cpu.r.y & 0x00FF;
      cpu.mmu.store_byte(location, low_byte);
      cpu.mmu.store_byte(location+1, high_byte);
    }
  }
};

var STY_absolute = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.x===1) {
      cpu.mmu.store_byte(location, cpu.r.y);
    } else {
      var high_byte = cpu.r.y & 0xFF00;
      var low_byte = cpu.r.y & 0x00FF;
      cpu.mmu.store_byte(location, low_byte);
      cpu.mmu.store_byte(location+1, high_byte); 
    } 
  }
};

var STX_direct_page_indexed_y = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    var location = bytes[0]+cpu.p.d+cpu.r.y;
    if(cpu.p.x===1) {
      cpu.mmu.store_byte(location, cpu.r.x);
    } else {
      var high_byte = cpu.r.x & 0xFF00;
      var low_byte = cpu.r.x & 0x00FF;
      // Check for overflow.
      var overflow_check = location - 0xffff;
      if(overflow_check > 0) {
        location = overflow_check-1; 
      }
      cpu.mmu.store_byte(location, low_byte);
      // Check for potential overflow again.
      if(location===0xffff) {
       location = 0;
      } else {
        location++;
      }
      cpu.mmu.store_byte(location, high_byte);
    }
  }
};

var STX_direct_page = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    var location = bytes[0]+cpu.p.d;
    if(cpu.p.x===1) {
      cpu.mmu.store_byte(location, cpu.r.x);
    } else {
      var high_byte = cpu.r.x & 0xFF00;
      var low_byte = cpu.r.x & 0x00FF;
      cpu.mmu.store_byte(location, low_byte);
      cpu.mmu.store_byte(location+1, high_byte);
    }
  }
};

var STX_absolute = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.x===1) {
      cpu.mmu.store_byte(location, cpu.r.x);
    } else {
      var high_byte = cpu.r.x & 0xFF00;
      var low_byte = cpu.r.x & 0x00FF;
      cpu.mmu.store_byte(location, low_byte);
      cpu.mmu.store_byte(location+1, high_byte); 
    } 
  }
};

var STA_absolute = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.m===1) {
      cpu.mmu.store_byte(location, cpu.r.a);
    } else {
      var high_byte = cpu.r.a & 0xFF00;
      var low_byte = cpu.r.a & 0x00FF;
      cpu.mmu.store_byte(location, low_byte);
      cpu.mmu.store_byte(location+1, high_byte); 
    } 
  }
};

var LDX_direct_page = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    var location = cpu.r.d + bytes[0];
    if(cpu.p.x===1) {
      cpu.r.x = cpu.mmu.read_byte(location);       
    } else {
      var high_byte = cpu.mmu.read_byte(location); 
      var low_byte = cpu.mmu.read_byte(location+1);
      cpu.r.x = high_byte | low_byte;
    }
    if(cpu.r.x===0) {
      cpu.p.z = 1;
    }
    // TODO: Set the n status bit of the p status register.
  }
};

var LDX_direct_page_indexed_y = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    var location = cpu.r.d + bytes[0] + cpu.r.y;
    if(cpu.p.x===1) {
      cpu.r.x = cpu.mmu.read_byte(location);       
    } else {
      // Check for overflow.
      var overflow_check = location - 0xffff;
      if(overflow_check > 0) {
        location = overflow_check-1; 
      }
      var high_byte = cpu.mmu.read_byte(location); 
      // Check for potential overflow again.
      if(location===0xffff) {
       location = 0;
      } else {
        location++;
      }
      var low_byte = cpu.mmu.read_byte(location);
      cpu.r.x = high_byte | low_byte;
    }
    if(cpu.r.x===0) {
      cpu.p.z = 1;
    }
    // TODO: Set the n status bit of the p status register.
  }

};

var LDA_direct_page = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d; 
    if(cpu.p.m===1) {
      cpu.r.a = cpu.mmu.read_byte(location);
    } else {
      var high_byte = cpu.mmu.read_byte(location); 
      var low_byte = cpu.mmu.read_byte(location+1);
      cpu.r.a = high_byte | low_byte;
    } 
    if(cpu.r.a===0) {
      cpu.p.z = 1;
    }
    // TODO: Set the n status bit of the p status register.
  }
};

var LDX_absolute_indexed_y = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0])+cpu.r.y;
    if(cpu.p.x===1) {
      cpu.r.x = cpu.mmu.read_byte(location);
    } else {
      var high_byte = cpu.mmu.read_byte(location); 
      var low_byte = cpu.mmu.read_byte(location+1);
      cpu.r.a = high_byte | low_byte;
    }
    if(cpu.r.x===0) {
      cpu.p.z = 1;
    }
    // TODO: Set the n status bit of the p status register.
  }
};

var LDX_absolute = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.x===1) {
      cpu.r.x = cpu.mmu.read_byte(location);
    } else {
      var high_byte = cpu.mmu.read_byte(location); 
      var low_byte = cpu.mmu.read_byte(location+1);
      cpu.r.a = high_byte | low_byte;
    }
    if(cpu.r.x===0) {
      cpu.p.z = 1;
    }
    // TODO: Set the n status bit of the p status register.
  }
};

var LDA_absolute = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.m===1) {
      cpu.r.a = cpu.mmu.read_byte(location);
    } else {
      var high_byte = cpu.mmu.read_byte(location); 
      var low_byte = cpu.mmu.read_byte(location+1);
      cpu.r.a = high_byte | low_byte;
    }
    if(cpu.r.a===0) {
      cpu.p.z = 1;
    }
    // TODO: Set the n status bit of the p status register.
  }
};

var LDA_const = {
  bytes_required: function(cpu) {
    if(cpu.p.m===0) {
      return 3;
    } else {
      return 2;
    }
  },
  execute: function(cpu, bytes) {
    if(cpu.p.m===0) {
      cpu.r.a = (bytes[1]<<8)|bytes[0];  
    } else {
      cpu.r.a = bytes[0];  
    }
    if(cpu.r.a===0) {
      cpu.p.z = 1;      
    }
    // TODO: Set the n bit in the status register(p). 
  }
};

var LDX_const = {
  bytes_required: function(cpu) { 
    if(cpu.p.x===0) { 
      return 3; 
    } else { 
      return 2;
    }
  },
  execute: function(cpu, bytes) {
    var constant;
    if(cpu.p.x===0) {
      cpu.r.x = (bytes[1]<<8)|bytes[0];  
    } else {
      cpu.r.x = bytes[0];  
    }
    if(cpu.r.x===0) {
      cpu.p.z = 1; 
    }
    // TODO: Set the n bit in the status register(p). 
  }
};

// Set bits in the p status register as specified by 1's in the position
// that represents each register.
var SEP = {
  bytes_required: function() { return 2; },
  execute: function(cpu, bytes) {
    // TODO: Handle emulation mode.
 
    var flags = bytes[0].toString(2);
    // Sometimes it cuts off zeros before hand, so add those zeros back.
    while(flags.length<8) {
      flags = '0' + flags;
    }

    var ops = { 0: function() { cpu.p.c = 1; }, 1: function() { cpu.p.z = 1; },
                2: function() { cpu.p.i = 1; }, 3: function() { cpu.p.d = 1; },
                4: function() { cpu.p.x = 1; }, 5: function() { cpu.p.m = 1; },
                6: function() { cpu.p.v = 1; }, 7: function() { cpu.p.n = 1; }};

    for(var i = 0; i < 8; i++) {
      if(flags[i]==='1') {
        ops[i]();
      }       
    }
  }
};

// Clear bits in the p status register as specified by 1's in the position
// that represents each register.
var REP = {
  bytes_required: function() { return 2; },
  execute: function(cpu, bytes) {
    // TODO: Handle emulation mode.
 
    var flags = bytes[0].toString(2);
    // Sometimes it cuts off zeros before hand, so add those zeros back.
    while(flags.length<8) {
      flags = '0' + flags;
    }

    var ops = { 0: function() { cpu.p.c = 0; }, 1: function() { cpu.p.z = 0; },
                2: function() { cpu.p.i = 0; }, 3: function() { cpu.p.d = 0; },
                4: function() { cpu.p.x = 0; }, 5: function() { cpu.p.m = 0; },
                6: function() { cpu.p.v = 0; }, 7: function() { cpu.p.n = 0; }};
 
    for(var i = 0; i < 8; i++) {
      if(flags[i]==='1') {
        ops[i]();
      }       
    }
  }
};

var XCE = {
  bytes_required: function() { return 1; },
  execute: function(cpu) {
    var temp = cpu.p.c; 
    cpu.p.c = cpu.p.e;
    cpu.p.e = temp;        
    if(cpu.p.e===1) {
      // Switching to emulation mode.
      var high_byte = cpu.r.a & 0xFF00;
      var low_byte = cpu.r.a & 0x00FF;
      cpu.r.a = low_byte;
      cpu.r.b = high_byte;
    } else {
      // Switching to native mode. 
      cpu.r.a = (cpu.r.b<<8) | cpu.r.a;
    }
  } 
};

var CLC = {
  bytes_required: function() { return 1; },
  execute: function(cpu) {
    cpu.p.c = 0;
  }  
};

var SEI = {
  bytes_required: function() { return 1; },
  execute: function(cpu) {
    cpu.p.i = 1;
  }
};

var CLI = {
  bytes_required: function() { return 1; },
  execute: function(cpu) {
    cpu.p.i = 0;
  }
};

var SEC = {
  bytes_required: function() { return 1; },
  execute: function(cpu) {
    cpu.p.c = 1;
  }
};

/**
 * Take a raw hex string representing the program and execute it.
 */
CPU_65816.prototype.execute = function(raw_hex, has_header) {
  this.mmu.load_rom(raw_hex);
  this.r.pc = 0x8000;
 
  if(has_header) {
    this.r.pc += 4096;
  }

  var executing = true;
  while(executing) {
    var b = this.mmu.read_byte(this.r.pc); 
    // If we reach the end of the code then stop everything.
    if(b==null) {
      break;
    }
    var operation = this.opcode_map[b];
    // Check if unsupported opcode.
    if(operation==null) {
      break;
    }
    var bytes_required = operation.bytes_required(cpu);
    if(bytes_required===1) {
      operation.execute(this);
    } else {
      var bytes = [];
      for(var i = 1; i < bytes_required; i++) {
          this.r.pc+=8;
          bytes.push(this.mmu.read_byte(this.r.pc));
      }
      operation.execute(this,bytes);
    }
    this.r.pc += 8;
  } 
}
