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
    a:0,     // Accumulator
    b:0,     // "Hidden" Accumulator Register(high byte in 8-bit mode)
    x:0,     // X Index Register
    y:0,     // Y Index Register
    d:0,     // Direct Page Register
    s:0x1ff, // Stack Pointer
    pc:0,    // Program Counter
    dbr:0,   // Data Bank Register
    pbr:0    // Program Bank Register
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
                      0xaf : LDA_absolute_long,
                      0xa5 : LDA_direct_page, 0xbd : LDA_absolute_indexed_x,
                      0xb9 : LDA_absolute_indexed_y,
                      0xb2 : LDA_direct_page_indirect,
                      0xa2 : LDX_const, 
                      0xae : LDX_absolute, 0xa6 : LDX_direct_page,
                      0xa0 : LDY_const, 0xbc : LDY_absolute_indexed_x,
                      0xb4 : LDY_direct_page_indexed_x,
                      0xbe : LDX_absolute_indexed_y,
                      0xb6 : LDX_direct_page_indexed_y,
                      0xac : LDY_absolute, 0xa4 : LDY_direct_page, 0xea : NOP,
                      0x8d : STA_absolute, 0x85 : STA_direct_page,
                      0x8f : STA_absolute_long, 
                      0x92 : STA_direct_page_indirect,
                      0x9d : STA_absolute_indexed_x, 
                      0x99 : STA_absolute_indexed_y,
                      0x95 : STA_direct_page_indexed_x, 
                      0x8e : STX_absolute, 0x86 : STX_direct_page,
                      0x96 : STX_direct_page_indexed_y,
                      0x8c : STY_absolute, 0x84 : STY_direct_page,
                      0x94 : STY_direct_page_indexed_x,
                      0x1a : INC_accumulator, 0xe6 : INC_direct_page,
                      0xee : INC_absolute, 0xe8 : INX, 0xc8 : INY,
                      0x3a : DEC_accumulator, 0xce : DEC_absolute, 
                      0xc6 : DEC_direct_page, 0xca : DEX, 0x88 : DEY,
                      0x9c : STZ_absolute, 0x64 : STZ_direct_page,
                      0x9e : STZ_absolute_indexed_x,
                      0x74 : STZ_direct_page_indexed_x, 0x9b : TXY,
                      0xbb : TYX, 0xaa : TAX, 0xa8 : TAY, 0x8a : TXA, 
                      0x98 : TYA, 0x4c : JMP_absolute, 
                      0x6c : JMP_absolute_indirect, 0x80 : BRA,
                      0xf0 : BEQ, 0xd0 : BNE, 0x90 : BCC, 0xb0 : BCS,
                      0x50 : BVC, 0x70 : BVS, 0x10 : BPL, 0x30 : BMI,
                      0x69 : ADC_const, 0x6d : ADC_absolute, 
                      0x65 : ADC_direct_page, 0x72 : ADC_direct_page_indirect,
                      0x7d : ADC_absolute_indexed_x, 
                      0x79 : ADC_absolute_indexed_y,
                      0x75 : ADC_direct_page_indexed_x, 0xe9 : SBC_const,
                      0xed : SBC_absolute, 0xe5 : SBC_direct_page,
                      0xf2 : SBC_direct_page_indirect, 
                      0xfd : SBC_absolute_indexed_x, 
                      0xf9 : SBC_absolute_indexed_y,
                      0xe1 : SBC_direct_page_indexed_x,
                      0xc9 : CMP_const, 0xc5 : CMP_direct_page,
                      0xcd : CMP_absolute, 0xe0 : CPX_const, 
                      0xec : CPX_absolute, 0xe4 : CPX_direct_page, 
                      0xc0 : CPY_const, 0xcc : CPY_absolute,
                      0xc4 : CPY_direct_page, 0x29 : AND_const,
                      0x2d : AND_absolute, 0x25 : AND_direct_page,
                      0x32 : AND_direct_page_indirect,
                      0x3d : AND_absolute_indexed_x,
                      0x39 : AND_absolute_indexed_y,
                      0x35 : AND_direct_page_indexed_x, 0x09 : ORA_const,
                      0x0d : ORA_absolute, 0x05 : ORA_direct_page,
                      0x12 : ORA_direct_page_indirect, 
                      0x1d : ORA_absolute_indexed_x, 
                      0x1f : ORA_absolute_indexed_y,
                      0x15 : ORA_direct_page_indexed_x,
                      0x49 : EOR_const, 0x4d : EOR_absolute,
                      0x45 : EOR_direct_page, 
                      0x52 : EOR_direct_page_indirect,
                      0x5d : EOR_absolute_indexed_x,
                      0x59 : EOR_absolute_indexed_y,
                      0x55 : EOR_direct_page_indexed_x, 
                      0x4a : LSR_accumulator, 0x4e : LSR_absolute,
                      0x46 : LSR_direct_page, 0x5e : LSR_absolute_indexed_x, 
                      0x56 : LSR_direct_page_indexed_x, 0x0a : ASL_accumulator,
                      0x0e : ASL_absolute, 0x06 : ASL_direct_page, 
                      0x1e : ASL_absolute_indexed_x, 
                      0x16 : ASL_direct_page_indexed_x, 0x2a : ROL_accumulator,
                      0x2e : ROL_absolute, 0x26 : ROL_direct_page,
                      0x3e : ROL_absolute_indexed_x, 
                      0x36 : ROL_direct_page_indexed_x, 0x6a : ROR_accumulator,
                      0x6e : ROR_absolute, 0x66 : ROR_direct_page,
                      0x7e : ROR_absolute_indexed_x,
                      0x76 : ROR_direct_page_indexed_x,
                      0x48 : PHA, 0x68 : PLA, 0x5a : PHY, 0x7a : PLY,
                      0xda : PHX, 0xfa : PLX, 0x08 : PHP, 0x28 : PLP, 
                      0xf4 : PEA, 0xd4 : PEI, 0x8b : PHB, 0xab : PLB };

  /**
   * Take a raw hex string representing the program and execute it.
   */
  this.execute = function(raw_hex, has_header) {
    this.mmu.load_rom(raw_hex);
    this.r.pc = 0x8000;
 
    if(has_header) {
      this.r.pc += 4096;
    }

    var executing = true;
    while(executing) {
      var b = this.mmu.read_byte(this.r.pc); 
      this.r.pc++;

      // If we reach the end of the code then stop everything.
      if(b==null) {
        break;
      }
      var operation = this.opcode_map[b];
      // Check if unsupported opcode.
      if(operation==null) {
        break;
      }
      var bytes_required = operation.bytes_required(this);
      if(bytes_required===1) {
        operation.execute(this);
      } else {
        var bytes = [];
        for(var i = 1; i < bytes_required; i++) {
          bytes.push(this.mmu.read_byte(this.r.pc));
          this.r.pc++;
        }
        operation.execute(this,bytes);
      }
    } 
  } 
}

var MMU = {
  cpu: {},
  memory: { 0: {} },

  read_byte: function(location) {
    return this.memory[this.cpu.r.dbr][location];
  },
 
  read_byte_long: function(location, bank) {
    return this.memory[bank][location];
  },
 
  store_byte: function(location, b) {
    this.memory[this.cpu.r.dbr][location] = b;       
  },

  store_byte_long: function(location, bank, b) {
    if(typeof this.memory[bank] === 'undefined') {
      this.memory[bank] = {};
    }
    this.memory[bank][location] = b;
  },

  load_rom: function(raw_hex) {
    var loc = 0x8000;
    var byte_buffer = [];
    for(var i = 0; i < raw_hex.length; i++) {
      byte_buffer.push(raw_hex[i]);
      if(byte_buffer.length===2) {
        this.store_byte(loc, parseInt(byte_buffer[0]+byte_buffer[1], "16")); 
        loc++;
        byte_buffer = [];      
      } 
    }    
  }
};

var PHB = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.mmu.store_byte(cpu.r.s--, cpu.r.dbr);
  }
};

var PLB = {
   bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.r.dbr = cpu.mmu.read_byte(++cpu.r.s);
    cpu.p.n = cpu.r.dbr >> 7;
    if(cpu.r.dbr===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  } 
};

var PEA = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    cpu.mmu.store_byte(cpu.r.s--, bytes[0]);
    cpu.mmu.store_byte(cpu.r.s--, bytes[1]);    
  }
};

var PEI = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0]+cpu.r.d;
    var low_byte = cpu.mmu.read_byte(location);
    var high_byte = cpu.mmu.read_byte(location+1);
    cpu.mmu.store_byte(cpu.r.s--, high_byte);
    cpu.mmu.store_byte(cpu.r.s--, low_byte); 
  }
};

var PHP = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    // TODO: Handle emulation mode.
    var p_byte = (cpu.p.n<<7)|(cpu.p.v<<6)|(cpu.p.m<<5)|(cpu.p.x<<4)|
                 (cpu.p.d<<3)|(cpu.p.i<<2)|(cpu.p.z<<1)|cpu.p.c;
    cpu.mmu.store_byte(cpu.r.s--, p_byte);
  }
};

var PLP = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    // TODO: Handle emulation mode.
    var p_byte = cpu.mmu.read_byte(++cpu.r.s);
    cpu.p.c = p_byte & 0x01;
    cpu.p.z = (p_byte & 0x02) >> 1;
    cpu.p.i = (p_byte & 0x04) >> 2;
    cpu.p.d = (p_byte & 0x08) >> 3;
    cpu.p.x = (p_byte & 0x10) >> 4;
    cpu.p.m = (p_byte & 0x20) >> 5;
    cpu.p.v = (p_byte & 0x40) >> 6;
    cpu.p.n = p_byte >> 7;
  }
};

var PHX = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    if(cpu.p.x) {
      cpu.mmu.store_byte(cpu.r.s--, cpu.r.x);
    } else {
      var low_byte = cpu.r.x & 0x00ff;
      var high_byte = cpu.r.x >> 8;
      cpu.mmu.store_byte(cpu.r.s--, high_byte);
      cpu.mmu.store_byte(cpu.r.s--, low_byte);
    }
  }
};

var PLX = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    if(cpu.p.x) {
      cpu.r.x = cpu.mmu.read_byte(++cpu.r.s);    
      cpu.p.n = cpu.r.x >> 7;
    } else {
      var low_byte = cpu.mmu.read_byte(++cpu.r.s);
      var high_byte = cpu.mmu.read_byte(++cpu.r.s);  
      cpu.r.x = (high_byte<<8)|low_byte;
      cpu.p.n = cpu.r.x >> 15;
    }
   
    if(cpu.r.x===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var PHY = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    if(cpu.p.x) {
      cpu.mmu.store_byte(cpu.r.s--, cpu.r.y);
    } else {
      var low_byte = cpu.r.y & 0x00ff;
      var high_byte = cpu.r.y >> 8;
      cpu.mmu.store_byte(cpu.r.s--, high_byte);
      cpu.mmu.store_byte(cpu.r.s--, low_byte);
    }
  }
};

var PLY = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    if(cpu.p.x) {
      cpu.r.y = cpu.mmu.read_byte(++cpu.r.s);    
      cpu.p.n = cpu.r.y >> 7;
    } else {
      var low_byte = cpu.mmu.read_byte(++cpu.r.s);
      var high_byte = cpu.mmu.read_byte(++cpu.r.s);  
      cpu.r.y = (high_byte<<8)|low_byte;
      cpu.p.n = cpu.r.y >> 15;
    }
   
    if(cpu.r.y===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var PHA = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    if(cpu.p.m) {
      cpu.mmu.store_byte(cpu.r.s--, cpu.r.a);
    } else {
      var low_byte = cpu.r.a & 0x00ff;
      var high_byte = cpu.r.a >> 8;
      cpu.mmu.store_byte(cpu.r.s--, high_byte);
      cpu.mmu.store_byte(cpu.r.s--, low_byte);
    }
  }
};

var PLA = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    if(cpu.p.m) {
      cpu.r.a = cpu.mmu.read_byte(++cpu.r.s);    
      cpu.p.n = cpu.r.a >> 7;
    } else {
      var low_byte = cpu.mmu.read_byte(++cpu.r.s);
      var high_byte = cpu.mmu.read_byte(++cpu.r.s);  
      cpu.r.a = (high_byte<<8)|low_byte;
      cpu.p.n = cpu.r.a >> 15;
    }
   
    if(cpu.r.a===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var ROR_accumulator = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    if(cpu.p.m) {
      var old_c = cpu.p.c;
      cpu.p.c = cpu.r.a & 0x01;
      cpu.r.a = cpu.r.a >> 1; 
      cpu.r.a &= 0x7f;
      cpu.r.a |= (old_c<<7);
      cpu.p.n = cpu.r.a >> 7;
    } else {
      var old_c = cpu.p.c;
      cpu.p.c = cpu.r.a & 0x0001;
      cpu.r.a = cpu.r.a >> 1;
      cpu.r.a &= 0x7fff;
      cpu.r.a |= (old_c<<15);
      cpu.p.n = cpu.r.a >> 15;
    }

    if(cpu.r.a===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var ROR_absolute = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu,bytes) {
    var location = (bytes[1]<<8)|bytes[0]; 
    var shiftee;
    if(cpu.p.m) {
      shiftee = cpu.mmu.read_byte(location);  
      var old_c = cpu.p.c;
      cpu.p.c = shiftee & 0x01;
      shiftee = shiftee >> 1; 
      shiftee &= 0x7f;
      shiftee |= (old_c<<7);
      cpu.p.n = shiftee >> 7;
      cpu.mmu.store_byte(location, shiftee);
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      shiftee = (high_byte<<8)|low_byte;
      var old_c = cpu.p.c;
      cpu.p.c = shiftee & 0x0001;
      shiftee = shiftee >> 1;
      shiftee &= 0x7fff;
      shiftee |= (old_c<<15);
      cpu.p.n = shiftee >> 15;
      low_byte = shiftee & 0x00ff;
      high_byte = shiftee >> 8;
      cpu.mmu.store_byte(location, low_byte);
      cpu.mmu.store_byte(location+1, high_byte);
    }

    if(shiftee===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var ROR_direct_page = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu,bytes) {
    var location = bytes[0]+cpu.r.d;
    var shiftee;
    if(cpu.p.m) {
      shiftee = cpu.mmu.read_byte(location);  
      var old_c = cpu.p.c;
      cpu.p.c = shiftee & 0x01;
      shiftee = shiftee >> 1; 
      shiftee &= 0x7f;
      shiftee |= (old_c<<7);
      cpu.p.n = shiftee >> 7;
      cpu.mmu.store_byte(location, shiftee);
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      shiftee = (high_byte<<8)|low_byte;
      var old_c = cpu.p.c;
      cpu.p.c = shiftee & 0x0001;
      shiftee = shiftee >> 1;
      shiftee &= 0x7fff;
      shiftee |= (old_c<<15);
      cpu.p.n = shiftee >> 15;
      low_byte = shiftee & 0x00ff;
      high_byte = shiftee >> 8;
      cpu.mmu.store_byte(location, low_byte);
      cpu.mmu.store_byte(location+1, high_byte);
    }

    if(shiftee===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var ROR_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0])+cpu.r.x;
    var location_high_byte = location >> 8;
    var location_low_byte = location & 0x00ff;
    ROR_absolute.execute(cpu, [location_low_byte, location_high_byte]);  
  }
};

var ROR_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    ROR_direct_page.execute(cpu, [bytes[0]+cpu.r.x]);  
  }
};

var ROL_accumulator = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    if(cpu.p.m) {
      var old_c = cpu.p.c;
      cpu.p.c = cpu.r.a >> 7;
      cpu.r.a = cpu.r.a << 1; 
      cpu.r.a &= 0xfe;
      cpu.r.a |= old_c;
      cpu.p.n = cpu.r.a >> 7;
    } else {
      var old_c = cpu.p.c;
      cpu.p.c = cpu.r.a >> 15;
      cpu.r.a = cpu.r.a << 1;
      cpu.r.a &= 0xfffe;
      cpu.r.a |= old_c;
      cpu.p.n = cpu.r.a >> 15;
    }

    if(cpu.r.a===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var ROL_absolute = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    var shiftee;
    if(cpu.p.m) {
      shiftee = cpu.mmu.read_byte(location);
      var old_c = cpu.p.c;
      cpu.p.c = shiftee >> 7;
      shiftee = shiftee << 1; 
      shiftee &= 0xfe;
      shiftee |= old_c;
      cpu.p.n = shiftee >> 7;
      cpu.mmu.store_byte(location, shiftee);
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      shiftee = (high_byte<<8)|low_byte;
      var old_c = cpu.p.c;
      cpu.p.c = shiftee >> 15;
      shiftee = shiftee << 1;
      shiftee &= 0xfffe;
      shiftee |= old_c;
      cpu.p.n = shiftee >> 15;
      low_byte = shiftee & 0x00ff;
      high_byte = shiftee >> 8;
      cpu.mmu.store_byte(location, low_byte);
      cpu.mmu.store_byte(location+1, high_byte);
    }
   
    if(shiftee===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0; 
    }
  }
};

var ROL_direct_page = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0]+cpu.r.d;
    var shiftee;
    if(cpu.p.m) {
      shiftee = cpu.mmu.read_byte(location);
      var old_c = cpu.p.c;
      cpu.p.c = shiftee >> 7;
      shiftee = shiftee << 1; 
      shiftee &= 0xfe;
      shiftee |= old_c;
      cpu.p.n = shiftee >> 7;
      cpu.mmu.store_byte(location, shiftee);
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      shiftee = (high_byte<<8)|low_byte;
      var old_c = cpu.p.c;
      cpu.p.c = shiftee >> 15;
      shiftee = shiftee << 1;
      shiftee &= 0xfffe;
      shiftee |= old_c;
      cpu.p.n = shiftee >> 15;
      low_byte = shiftee & 0x00ff;
      high_byte = shiftee >> 8;
      cpu.mmu.store_byte(location, low_byte);
      cpu.mmu.store_byte(location+1, high_byte);
    }
   
    if(shiftee===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0; 
    }
  }
};

var ROL_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0])+cpu.r.x;
    var location_high_byte = location >> 8;
    var location_low_byte = location & 0x00ff;
    ROL_absolute.execute(cpu, [location_low_byte, location_high_byte]);  
  }
};

var ROL_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    ROL_direct_page.execute(cpu, [bytes[0]+cpu.r.x]);  
  }
};

var ASL_accumulator = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    if(cpu.p.m) {
      cpu.p.c = cpu.r.a >> 7;
      cpu.r.a = cpu.r.a << 1; 
      cpu.r.a &= 0xff;
      cpu.p.n = cpu.r.a >> 7;
    } else {
      cpu.p.c = cpu.r.a >> 15;
      cpu.r.a = cpu.r.a << 1;
      cpu.r.a &= 0xffff;
      cpu.p.n = cpu.r.a >> 15;
    }   
 
    if(cpu.r.a===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var ASL_absolute = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    var shiftee;
    if(cpu.p.m) {
      shiftee = cpu.mmu.read_byte(location);
      cpu.p.c = shiftee >> 7;
      shiftee = shiftee << 1; 
      shiftee &= 0xff;
      cpu.p.n = shiftee >> 7;
      cpu.mmu.store_byte(location, shiftee);
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      shiftee = (high_byte<<8)|low_byte;
      cpu.p.c = shiftee >> 15;
      shiftee = shiftee << 1;
      shiftee &= 0xffff;
      cpu.p.n = shiftee >> 15;
      low_byte = shiftee & 0x00ff;
      high_byte = shiftee >> 8;
      cpu.mmu.store_byte(location, low_byte);
      cpu.mmu.store_byte(location+1, high_byte);
    }   
 
    if(shiftee===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var ASL_direct_page = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu,bytes) {
    var location = bytes[0]+cpu.r.d;
    var shiftee;
    if(cpu.p.m) {
      shiftee = cpu.mmu.read_byte(location);
      cpu.p.c = shiftee >> 7;
      shiftee = shiftee << 1; 
      shiftee &= 0xff;
      cpu.p.n = shiftee >> 7;
      cpu.mmu.store_byte(location, shiftee);
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      shiftee = (high_byte<<8)|low_byte;
      cpu.p.c = shiftee >> 15;
      shiftee = shiftee << 1;
      shiftee &= 0xffff;
      cpu.p.n = shiftee >> 15;
      low_byte = shiftee & 0x00ff;
      high_byte = shiftee >> 8;
      cpu.mmu.store_byte(location, low_byte);
      cpu.mmu.store_byte(location+1, high_byte);
    }   
 
    if(shiftee===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var ASL_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0])+cpu.r.x;
    var location_high_byte = location >> 8;
    var location_low_byte = location & 0x00ff;
    ASL_absolute.execute(cpu, [location_low_byte, location_high_byte]);  
  }
};

var ASL_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    ASL_direct_page.execute(cpu, [bytes[0]+cpu.r.x]);  
  }
};

var LSR_accumulator = {
  bytes_required:function(cpu) {
    return 1;
  },
  execute:function(cpu) {
    if(cpu.p.m) {
      cpu.p.c = cpu.r.a & 0x0001;   
    } else {
      cpu.p.c = cpu.r.a & 0x01;
    }
    cpu.r.a = cpu.r.a >> 1;
 
    cpu.p.n = 0;
    if(cpu.r.a===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var LSR_absolute = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    var shiftee;
    if(cpu.p.m) {
      shiftee = cpu.mmu.ready_byte(location);
      cpu.p.c = shiftee & 0x0001;   
      shiftee = shiftee >> 1;
      cpu.mmu.store_byte(location, shiftee); 
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      shiftee = (high_byte<<8)|low_byte;
      cpu.p.c = cpu.r.a & 0x01;
      shiftee = shiftee >> 1;
      low_byte = shiftee & 0x00ff;
      high_byte = shiftee >> 8;
      cpu.mmu.store_byte(location, low_byte);
      cpu.mmu.store_byte(location+1, high_byte);
    }
 
    cpu.p.n = 0;
    if(shiftee===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var LSR_direct_page = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var shiftee;
    if(cpu.p.m) {
      shiftee = cpu.mmu.ready_byte(location);
      cpu.p.c = shiftee & 0x0001;   
      shiftee = shiftee >> 1;
      cpu.mmu.store_byte(location, shiftee); 
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      shiftee = (high_byte<<8)|low_byte;
      cpu.p.c = cpu.r.a & 0x01;
      shiftee = shiftee >> 1;
      low_byte = shiftee & 0x00ff;
      high_byte = shiftee >> 8;
      cpu.mmu.store_byte(location, low_byte);
      cpu.mmu.store_byte(location+1, high_byte);
    }
    
    cpu.p.n = 0;
    if(shiftee===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var LSR_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0])+cpu.r.x;
    var location_high_byte = location >> 8;
    var location_low_byte = location & 0x00ff;
    LSR_absolute.execute(cpu, [location_low_byte, location_high_byte]);  
  }
};

var LSR_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    LSR_direct_page.execute(cpu, [bytes[0]+cpu.r.x]);  
  }
};

var EOR_const = {
  bytes_required:function(cpu) {
    if(cpu.p.m) {
      return 2;
    } else {
      return 3; 
    }
  },
  execute:function(cpu, bytes) {
    if(cpu.p.m) {
      cpu.r.a ^= bytes[0];
      cpu.p.n = cpu.r.a >> 7;
    } else {
      cpu.r.a ^= (bytes[1]<<8)|bytes[0];
      cpu.p.n = cpu.r.a >> 15;
    }

    if(cpu.r.a===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }  
  }
};

var EOR_absolute = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.m) {
      EOR_const.execute(cpu, [cpu.mmu.read_byte(location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      EOR_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var EOR_direct_page = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    if(cpu.p.m) {
      EOR_const.execute(cpu, cpu.mmu.read_byte(location));
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      EOR_const.execute(cpu, [low_byte, high_byte]);
    } 
  }
};

var EOR_direct_page_indirect = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var low_byte_loc = cpu.mmu.read_byte(location);
    var high_byte_loc = cpu.mmu.read_byte(location+1);
    var absolute_location = (high_byte_loc<<8) | low_byte_loc;
    if(cpu.p.m) {
      EOR_const.execute(cpu, [cpu.mmu.read_byte(absolute_location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(absolute_location);
      var high_byte = cpu.mmu.read_byte(absolute_location+1);
      EOR_const.execute(cpu, [low_byte, high_byte]);
    }
  } 
};

var EOR_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0])+cpu.r.x;
    var location_high_byte = location >> 8;
    var location_low_byte = location & 0x00ff;
    EOR_absolute.execute(cpu, [location_low_byte, location_high_byte]);  
  }
};

var EOR_absolute_indexed_y = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0])+cpu.r.y;
    var location_high_byte = location >> 8;
    var location_low_byte = location & 0x00ff;
    EOR_absolute.execute(cpu, [location_low_byte, location_high_byte]);  
  }
};

var EOR_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    EOR_direct_page.execute(cpu, [bytes[0]+cpu.r.x]);  
  }
};

var ORA_const = {
  bytes_required:function(cpu) {
    if(cpu.p.m) {
      return 2;
    } else {
      return 3; 
    }
  },
  execute:function(cpu, bytes) {
    if(cpu.p.m) {
      cpu.r.a |= bytes[0];
      cpu.p.n = cpu.r.a >> 7;
    } else {
      cpu.r.a |= (bytes[1]<<8)|bytes[0];
      cpu.p.n = cpu.r.a >> 15;
    }

    if(cpu.r.a===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }  
  }
};

var ORA_absolute = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.m) {
      ORA_const.execute(cpu, [cpu.mmu.read_byte(location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      ORA_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var ORA_direct_page = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    if(cpu.p.m) {
      ORA_const.execute(cpu, cpu.mmu.read_byte(location));
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      ORA_const.execute(cpu, [low_byte, high_byte]);
    } 
  }
};

var ORA_direct_page_indirect = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var low_byte_loc = cpu.mmu.read_byte(location);
    var high_byte_loc = cpu.mmu.read_byte(location+1);
    var absolute_location = (high_byte_loc<<8) | low_byte_loc;
    if(cpu.p.m) {
      ORA_const.execute(cpu, [cpu.mmu.read_byte(absolute_location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(absolute_location);
      var high_byte = cpu.mmu.read_byte(absolute_location+1);
      ORA_const.execute(cpu, [low_byte, high_byte]);
    }
  } 
};

var ORA_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0])+cpu.r.x;
    var location_high_byte = location >> 8;
    var location_low_byte = location & 0x00ff;
    ORA_absolute.execute(cpu, [location_low_byte, location_high_byte]);  
  }
};

var ORA_absolute_indexed_y = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0])+cpu.r.y;
    var location_high_byte = location >> 8;
    var location_low_byte = location & 0x00ff;
    ORA_absolute.execute(cpu, [location_low_byte, location_high_byte]);  
  }
};

var ORA_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    ORA_direct_page.execute(cpu, [bytes[0]+cpu.r.x]);  
  }
};

var AND_const = {
  bytes_required:function(cpu) {
    if(cpu.p.m) {
      return 2;
    } else {
      return 3; 
    }
  },
  execute:function(cpu, bytes) {
    if(cpu.p.m) {
      cpu.r.a &= bytes[0];
      cpu.p.n = cpu.r.a >> 7;
    } else {
      cpu.r.a &= (bytes[1]<<8)|bytes[0];
      cpu.p.n = cpu.r.a >> 15;
    }

    if(cpu.r.a===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }  
  }
};

var AND_absolute = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.m) {
      AND_const.execute(cpu, [cpu.mmu.read_byte(location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      AND_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var AND_direct_page = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    if(cpu.p.m) {
      AND_const.execute(cpu, cpu.mmu.read_byte(location));
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      AND_const.execute(cpu, [low_byte, high_byte]);
    } 
  }
};

var AND_direct_page_indirect = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var low_byte_loc = cpu.mmu.read_byte(location);
    var high_byte_loc = cpu.mmu.read_byte(location+1);
    var absolute_location = (high_byte_loc<<8) | low_byte_loc;
    if(cpu.p.m) {
      AND_const.execute(cpu, [cpu.mmu.read_byte(absolute_location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(absolute_location);
      var high_byte = cpu.mmu.read_byte(absolute_location+1);
      AND_const.execute(cpu, [low_byte, high_byte]);
    }
  } 
};

var AND_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0])+cpu.r.x;
    var location_high_byte = location >> 8;
    var location_low_byte = location & 0x00ff;
    AND_absolute.execute(cpu, [location_low_byte, location_high_byte]);  
  }
};

var AND_absolute_indexed_y = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0])+cpu.r.y;
    var location_high_byte = location >> 8;
    var location_low_byte = location & 0x00ff;
    AND_absolute.execute(cpu, [location_low_byte, location_high_byte]);  
  }
};

var AND_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    AND_direct_page.execute(cpu, [bytes[0]+cpu.r.x]);  
  }
};


var CPX_const = {
  bytes_required:function(cpu) {
    if(cpu.p.x) {
      return 2; 
    } else {
      return 3; 
    }
  },
  execute:function(cpu, bytes) {
    var result;
    if(cpu.p.x) {
      result = cpu.r.x - bytes[0];  
      if(result<0) {
        cpu.p.c = 0;
        result = 0x100 + result;
      } else {
        cpu.p.c = 1;
      }
      cpu.p.n = result >> 7;
    } else {
      result = cpu.r.x - ((bytes[1]<<8)|bytes[0]); 
      if(result<0) {
        cpu.p.c = 0;
        result = 0x10000 + result;
      } else {
        cpu.p.c = 1;
      }
      cpu.p.n = result >> 15;
    }

    if(result===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }    
  }
};

var CPX_direct_page = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    if(cpu.p.m) {
      CPX_const.execute(cpu, cpu.mmu.read_byte(location));
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      CPX_const.execute(cpu, [low_byte, high_byte]);
    } 
  }
};

var CPX_absolute = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.x) {
      CPX_const.execute(cpu, [cpu.mmu.read_byte(location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      CPX_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var CPY_const = {
  bytes_required:function(cpu) {
    if(cpu.p.x) {
      return 2; 
    } else {
      return 3; 
    }
  },
  execute:function(cpu, bytes) {
    var result;
    if(cpu.p.x) {
      result = cpu.r.y - bytes[0];  
      if(result<0) {
        cpu.p.c = 0;
        result = 0x100 + result;
      } else {
        cpu.p.c = 1;
      }
      cpu.p.n = result >> 7;
    } else {
      result = cpu.r.y - ((bytes[1]<<8)|bytes[0]); 
      if(result<0) {
        cpu.p.c = 0;
        result = 0x10000 + result;
      } else {
        cpu.p.c = 1;
      }
      cpu.p.n = result >> 15;
    }

    if(result===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }    
  }
};

var CPY_direct_page = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    if(cpu.p.m) {
      CPY_const.execute(cpu, cpu.mmu.read_byte(location));
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      CPY_const.execute(cpu, [low_byte, high_byte]);
    } 
  }
};

var CPY_absolute = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.x) {
      CPY_const.execute(cpu, [cpu.mmu.read_byte(location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      CPY_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var CMP_const = {
  bytes_required:function(cpu) {
    if(cpu.p.m) {
      return 2; 
    } else {
      return 3; 
    }
  },
  execute:function(cpu, bytes) {
    var result;
    if(cpu.p.m) {
      result = cpu.r.a - bytes[0];  
      if(result<0) {
        cpu.p.c = 0;
        result = 0x100 + result;
      } else {
        cpu.p.c = 1;
      }
      cpu.p.n = result >> 7;
    } else {
      result = cpu.r.a - ((bytes[1]<<8)|bytes[0]); 
      if(result<0) {
        cpu.p.c = 0;
        result = 0x10000 + result;
      } else {
        cpu.p.c = 1;
      }
      cpu.p.n = result >> 15;
    }

    if(result===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }    
  }
};

var CMP_direct_page = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    if(cpu.p.m) {
      CMP_const.execute(cpu, cpu.mmu.read_byte(location));
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      CMP_const.execute(cpu, [low_byte, high_byte]);
    } 
  }
};

var CMP_absolute = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.m) {
      CMP_const.execute(cpu, [cpu.mmu.read_byte(location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      CMP_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var SBC_const = {
  bytes_required:function(cpu) {
    if(cpu.p.m) {
      return 2;
    } else {
      return 3;
    }  
  },
  execute:function(cpu, bytes) {
    var old_a = cpu.r.a;
    if(cpu.p.m) {
      cpu.r.a -= bytes[0] - cpu.p.c;
      if(cpu.r.a < 0) {
        cpu.p.c = 0; 
        cpu.r.a = 0x100 + cpu.r.a;
      } else {
        cpu.p.c = 1;
      }
      cpu.p.n = cpu.r.a >> 7;  

      // Check for signed overflow.
      // If they started with the same sign and then the resulting sign is
      // different then we have a signed overflow.
      if((!((old_a ^ bytes[0]) & 0x80)) && ((cpu.r.a ^ old_a) & 0x80)) {
        cpu.p.v = 1;
      } else {
        cpu.p.v = 0;
      }
    } else {
      var argument = (bytes[1]<<8)|bytes[0]; 
      cpu.r.a -= argument - cpu.p.c;
      if(cpu.r.a < 0) {
        cpu.p.c = 0; 
        cpu.r.a = 0x10000 + cpu.r.a;
      } else {
        cpu.p.c = 1;
      }
      cpu.p.n = cpu.r.a >> 15;  

      // Check for signed overflow.
      // If they started with the same sign and then the resulting sign is
      // different then we have a signed overflow.
      if((!((old_a ^ argument) & 0x8000)) && ((cpu.r.a ^ old_a) & 0x8000)) {
        cpu.p.v = 1;
      } else {
        cpu.p.v = 0;
      }     
    } 

    if(cpu.r.a===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var SBC_direct_page = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    if(cpu.p.m) {
      SBC_const.execute(cpu, [cpu.mmu.read_byte(location)]); 
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      SBC_const.execute(cpu, [low_byte, high_byte]); 
    }
  }
};

var SBC_absolute = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.m) {
      SBC_const.execute(cpu, [cpu.mmu.read_byte(location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      SBC_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var SBC_direct_page_indirect = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var low_byte_loc = cpu.mmu.read_byte(location);
    var high_byte_loc = cpu.mmu.read_byte(location+1);
    var absolute_location = (high_byte_loc<<8) | low_byte_loc;
    if(cpu.p.m) {
      SBC_const.execute(cpu, [cpu.mmu.read_byte(absolute_location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(absolute_location);
      var high_byte = cpu.mmu.read_byte(absolute_location+1);
      SBC_const.execute(cpu, [low_byte, high_byte]);
    }
  } 
};

var SBC_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0])+cpu.r.x;
    var location_high_byte = location >> 8;
    var location_low_byte = location & 0x00ff;
    SBC_absolute.execute(cpu, [location_low_byte, location_high_byte]);  
  }
};

var SBC_absolute_indexed_y = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0])+cpu.r.y;
    var location_high_byte = location >> 8;
    var location_low_byte = location & 0x00ff;
    SBC_absolute.execute(cpu, [location_low_byte, location_high_byte]);  
  }
};

var SBC_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    SBC_direct_page.execute(cpu, [bytes[0]+cpu.r.x]);  
  }
};

var SBC_direct_page_indirect = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var low_byte_loc = cpu.mmu.read_byte(location);
    var high_byte_loc = cpu.mmu.read_byte(location+1);
    var absolute_location = (high_byte_loc<<8) | low_byte_loc;
    if(cpu.p.m) {
      SBC_const.execute(cpu, [cpu.mmu.read_byte(absolute_location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(absolute_location);
      var high_byte = cpu.mmu.read_byte(absolute_location+1);
      SBC_const.execute(cpu, [low_byte, high_byte]);
    }
  } 
};


var ADC_const = {
  bytes_required:function(cpu) {
    if(cpu.p.m) {
      return 2;
    } else {
      return 3;
    }
  },
  execute:function(cpu, bytes) {
    var old_a = cpu.r.a; 
    if(cpu.p.m) {
      cpu.r.a += bytes[0] + cpu.p.c;
      if(cpu.r.a & 0x100) {
        cpu.p.c = 1;
      } else {
        cpu.p.c = 0;
      } 
      cpu.r.a &= 0xff;
      cpu.p.n = cpu.r.a >> 7;
       
      // Check for signed overflow.
      // If they started with the same sign and then the resulting sign is
      // different then we have a signed overflow.
      if((!((old_a ^ bytes[0]) & 0x80)) && ((cpu.r.a ^ old_a) & 0x80)) {
        cpu.p.v = 1;
      } else {
        cpu.p.v = 0;
      }
    } else {
      var argument = (bytes[1]<<8)|bytes[0];
      cpu.r.a += argument + cpu.p.c;
      if(cpu.r.a & 0x10000) {
        cpu.p.c = 1;
      } else {
        cpu.p.c = 0; 
      }
      cpu.r.a &= 0xffff;
      cpu.p.n = cpu.r.a >> 15;

      // Check for signed overflow.
      // If they started with the same sign and then the resulting sign is
      // different then we have a signed overflow.
      if((!((old_a ^ argument) & 0x8000)) && ((cpu.r.a ^ old_a) & 0x8000)) {
        cpu.p.v = 1;
      } else {
        cpu.p.v = 0;
      }
    }

    if(cpu.r.a===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var ADC_absolute = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.m) {
      ADC_const.execute(cpu, [cpu.mmu.read_byte(location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      ADC_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var ADC_direct_page = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    if(cpu.p.m) {
      ADC_const.execute(cpu, [cpu.mmu.read_byte(location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      ADC_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var ADC_direct_page_indirect = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var low_byte_loc = cpu.mmu.read_byte(location);
    var high_byte_loc = cpu.mmu.read_byte(location+1);
    var absolute_location = (high_byte_loc<<8) | low_byte_loc;
    if(cpu.p.m) {
      ADC_const.execute(cpu, [cpu.mmu.read_byte(absolute_location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(absolute_location);
      var high_byte = cpu.mmu.read_byte(absolute_location+1);
      ADC_const.execute(cpu, [low_byte, high_byte]);
    }
  } 
};

var ADC_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0])+cpu.r.x;
    var location_high_byte = location >> 8;
    var location_low_byte = location & 0x00ff;
    ADC_absolute.execute(cpu, [location_low_byte, location_high_byte]);  
  }
};

var ADC_absolute_indexed_y = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0])+cpu.r.y;
    var location_high_byte = location >> 8;
    var location_low_byte = location & 0x00ff;
    ADC_absolute.execute(cpu, [location_low_byte, location_high_byte]);  
  }
};

var ADC_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    ADC_direct_page.execute(cpu, [bytes[0]+cpu.r.x]);  
  }
};

var BMI = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if(cpu.p.n) {
       // Handle single byte two's complement numbers as the branch argument.
      if(bytes[0]<=127) {
        cpu.r.pc+=bytes[0];
      } else {
        cpu.r.pc-=256-bytes[0];
      }
    }
  }
};

var BPL = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if(!cpu.p.n) {
       // Handle single byte two's complement numbers as the branch argument.
      if(bytes[0]<=127) {
        cpu.r.pc+=bytes[0];
      } else {
        cpu.r.pc-=256-bytes[0];
      }
    }
  }
};

var BVC = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if(!cpu.p.v) {
       // Handle single byte two's complement numbers as the branch argument.
      if(bytes[0]<=127) {
        cpu.r.pc+=bytes[0];
      } else {
        cpu.r.pc-=256-bytes[0];
      }
    }
  }
};


var BVS = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if(cpu.p.v) {
       // Handle single byte two's complement numbers as the branch argument.
      if(bytes[0]<=127) {
        cpu.r.pc+=bytes[0];
      } else {
        cpu.r.pc-=256-bytes[0];
      }
    }
  }
};

var BCC = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if(!cpu.p.c) {
       // Handle single byte two's complement numbers as the branch argument.
      if(bytes[0]<=127) {
        cpu.r.pc+=bytes[0];
      } else {
        cpu.r.pc-=256-bytes[0];
      }
    }
  }
};

var BCS = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if(cpu.p.c) {
       // Handle single byte two's complement numbers as the branch argument.
      if(bytes[0]<=127) {
        cpu.r.pc+=bytes[0];
      } else {
        cpu.r.pc-=256-bytes[0];
      }
    }
  }
};

var BEQ = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if(cpu.p.z) {
       // Handle single byte two's complement numbers as the branch argument.
      if(bytes[0]<=127) {
        cpu.r.pc+=bytes[0];
      } else {
        cpu.r.pc-=256-bytes[0];
      }
    }
  }
};

var BNE = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if(!cpu.p.z) {
       // Handle single byte two's complement numbers as the branch argument.
      if(bytes[0]<=127) {
        cpu.r.pc+=bytes[0];
      } else {
        cpu.r.pc-=256-bytes[0];
      }
    }
  }
 
};

var BRA = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    // Handle single byte two's complement numbers as the branch argument.
    if(bytes[0]<=127) {
      cpu.r.pc+=bytes[0];
    } else {
      cpu.r.pc-=256-bytes[0];
    }
  }
};

var JMP_absolute_indirect = {
  bytes_required:function() {
    return 3;
  }, 
  execute:function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    var low_byte = cpu.mmu.read_byte(location);
    var high_byte = cpu.mmu.read_byte(location+1);
    cpu.r.pc = (high_byte<<8) | low_byte;
  }
};

var JMP_absolute = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    cpu.r.pc = (bytes[1]<<8)|bytes[0];
  } 
};

var TYA = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    if(cpu.p.m) {
      if(cpu.p.x) {
        // 8-bit index register to 8-bit accumulator.
        cpu.r.a = cpu.r.y;    
      } else {
        // 16-bit index register to 8-bit accumulator.
        cpu.r.a = cpu.r.y & 0x00ff;     
      }
      cpu.p.n = cpu.r.a >> 7;
    } else {
      // 8-bit index register to 16-bit accumulator. 
      // 16-bit index register to 16-bit accumulator.
      cpu.r.a = cpu.r.y;
      cpu.p.n = cpu.r.a >> 15; 
    } 
    if(cpu.r.a===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var TAY = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    if(cpu.p.m) {
      if(cpu.p.x) {
        // 8-bit accumulator to 8-bit x index register.
        cpu.r.y = cpu.r.a; 
        cpu.p.n = cpu.r.y >> 7;
      } else {
        // 8-bit accumulator to 16-bit x index register.
        cpu.r.y = cpu.r.b;  // Transfer b as high-byte of x.
        cpu.r.y |= cpu.r.a; // Use the bitwise or to add a as the low-byte.
        cpu.p.n = cpu.r.y >> 15;
      }
    } else {
      if(cpu.p.x) {
        // 16-bit accumulator to 8-bit x index register. 
        cpu.r.y = cpu.r.a & 0x00ff; // Transfer only the low-byte to x.
        cpu.p.n = cpu.r.y >> 7;
      } else {
        // 16-bit accumulator to 16-bit x index register.
        cpu.r.y = cpu.r.a;
        cpu.p.n = cpu.r.y >> 15;
      }
    }
    if(cpu.r.y===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};


var TXA = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    if(cpu.p.m) {
      if(cpu.p.x) {
        // 8-bit index register to 8-bit accumulator.
        cpu.r.a = cpu.r.x;    
      } else {
        // 16-bit index register to 8-bit accumulator.
        cpu.r.a = cpu.r.x & 0x00ff;     
      }
      cpu.p.n = cpu.r.a >> 7;
    } else {
      // 8-bit index register to 16-bit accumulator. 
      // 16-bit index register to 16-bit accumulator.
      cpu.r.a = cpu.r.x; 
      cpu.p.n = cpu.r.a >> 15; 
    }
    if(cpu.r.a===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var TAX = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    if(cpu.p.m) {
      if(cpu.p.x) {
        // 8-bit accumulator to 8-bit x index register.
        cpu.r.x = cpu.r.a; 
        cpu.p.n = cpu.r.x >> 7;
      } else {
        // 8-bit accumulator to 16-bit x index register.
        cpu.r.x = cpu.r.b;  // Transfer b as high-byte of x.
        cpu.r.x |= cpu.r.a; // Use the bitwise or to add a as the low-byte.
        cpu.p.n = cpu.r.x >> 15;
      }
    } else {
      if(cpu.p.x) {
        // 16-bit accumulator to 8-bit x index register. 
        cpu.r.x = cpu.r.a & 0x00ff; // Transfer only the low-byte to x.
        cpu.p.n = cpu.r.x >> 7;
      } else {
        // 16-bit accumulator to 16-bit x index register.
        cpu.r.x = cpu.r.a;
        cpu.p.n = cpu.r.x >> 15;
      }
    }
    if(cpu.r.x===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var TXY = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.r.y = cpu.r.x;
    if(cpu.r.y===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }

    if(cpu.p.x) {
      cpu.p.n = cpu.r.y >> 7;
    } else {
      cpu.p.n = cpu.r.y >> 15;
    }
  }
};

var TYX = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.r.x = cpu.r.y;
    if(cpu.r.x===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
    
    if(cpu.p.x) {
      cpu.p.n = cpu.r.y >> 7;
    } else {
      cpu.p.n = cpu.r.y >> 15;
    }
  }
};

var STZ_absolute = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.m) {
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
    if(cpu.p.m) {
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
    if(cpu.p.m) {
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
    if(cpu.p.m) {
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

var STA_direct_page_indirect = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    if(cpu.p.m) {
      var low_byte_loc = cpu.mmu.read_byte(location);
      var high_byte_loc = cpu.mmu.read_byte(location+1);
      cpu.mmu.store_byte((high_byte_loc<<8) | low_byte_loc, cpu.r.a); 
    } else {
      var low_byte_loc = cpu.mmu.read_byte(location);
      var high_byte_loc = cpu.mmu.read_byte(location+1);
      var absolute_location = (high_byte_loc<<8) | low_byte_loc;
      var low_byte = cpu.r.a & 0x00ff;
      var high_byte = cpu.r.a >> 8;
      cpu.mmu.store_byte(absolute_location, low_byte);
      cpu.mmu.store_byte(absolute_location+1, high_byte);
    }
  }
};

var LDA_direct_page_indirect = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    if(cpu.p.m) {
      var low_byte_loc = cpu.mmu.read_byte(location);
      var high_byte_loc = cpu.mmu.read_byte(location+1);
      cpu.r.a = cpu.mmu.read_byte((high_byte_loc<<8) | low_byte_loc); 
      cpu.p.n = cpu.r.a >> 7;
    } else {
      var low_byte_loc = cpu.mmu.read_byte(location);
      var high_byte_loc = cpu.mmu.read_byte(location+1);
      var absolute_location = high_byte_loc | low_byte_loc;
      var low_byte = cpu.mmu.read_byte(absolute_location);
      var high_byte = cpu.mmu.read_byte(absolute_location+1);
      cpu.r.a = (high_byte<<8) | low_byte;
      cpu.p.n = cpu.r.a >> 15;
    }
    if(cpu.r.a===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0; 
    }
  }
};

var LDA_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d + cpu.r.x; 
    if(cpu.p.m) {
      cpu.r.a = cpu.mmu.read_byte(location);
      cpu.p.n = cpu.r.a >> 7;
    } else {
      // Check for overflow.
      var overflow_check = location - 0xffff;
      if(overflow_check > 0) {
        location = overflow_check-1; 
      }
      var low_byte = cpu.mmu.read_byte(location); 
      // Check for potential overflow again.
      if(location===0xffff) {
       location = 0;
      } else {
        location++;
      }
      var high_byte = cpu.mmu.read_byte(location);
      cpu.r.a = low_byte | (high_byte<<8);
      cpu.p.n = cpu.r.a >> 15;
    } 
    if(cpu.r.a===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var LDA_absolute_indexed_y = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0])+cpu.r.y;
    if(cpu.p.m) {
      cpu.r.a = cpu.mmu.read_byte(location);
      cpu.p.n = cpu.r.a >> 7;
    } else {
      var low_byte = cpu.mmu.read_byte(location); 
      var high_byte = cpu.mmu.read_byte(location+1);
      cpu.r.a = (high_byte<<8) | low_byte;
      cpu.p.n = cpu.r.a >> 15;
    }
    if(cpu.r.a===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var LDA_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0])+cpu.r.x;
    if(cpu.p.m) {
      cpu.r.a = cpu.mmu.read_byte(location);
      cpu.p.n = cpu.r.a >> 7;
    } else {
      var low_byte = cpu.mmu.read_byte(location); 
      var high_byte = cpu.mmu.read_byte(location+1);
      cpu.r.a = (high_byte<<8) | low_byte;
      cpu.p.n = cpu.r.a >> 15;
    }
    if(cpu.r.a===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
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
    if(cpu.p.x) {
      cpu.r.y = bytes[0]; 
      cpu.p.n = cpu.r.y >> 7;
    } else {
      cpu.r.y = (bytes[1]<<8)|bytes[0];
      cpu.p.n = cpu.r.y >> 15;
    }
    if(cpu.r.y===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var LDY_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0]) + cpu.r.x;
    if(cpu.p.x) {
      cpu.r.y = cpu.mmu.read_byte(location);
      cpu.p.n = cpu.r.y >> 7;
    } else {
      var low_byte = cpu.mmu.read_byte(location); 
      var high_byte = cpu.mmu.read_byte(location+1);
      cpu.r.y = (high_byte<<8) | low_byte;
      cpu.p.n = cpu.r.y >> 15;
    }
    if(cpu.r.y===0) {
      cpu.p.z = 1; 
    } else {
      cpu.p.z = 0;
    }
  }
};

var LDY_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d + cpu.r.x; 
    if(cpu.p.x) {
      cpu.r.y = cpu.mmu.read_byte(location);
      cpu.p.n = cpu.r.y >> 7;
    } else {
      // Check for overflow.
      var overflow_check = location - 0xffff;
      if(overflow_check > 0) {
        location = overflow_check-1; 
      }
      var low_byte = cpu.mmu.read_byte(location); 
      // Check for potential overflow again.
      if(location===0xffff) {
       location = 0;
      } else {
        location++;
      }
      var high_byte = cpu.mmu.read_byte(location);
      cpu.r.y = (high_byte<<8) | low_byte;
      cpu.p.n = cpu.r.y >> 15;
    } 
    if(cpu.r.a===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
}

var LDY_absolute = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.x) {
      cpu.r.y = cpu.mmu.read_byte(location);
      cpu.p.n = cpu.r.y >> 7;
    } else {
      var low_byte = cpu.mmu.read_byte(location); 
      var high_byte = cpu.mmu.read_byte(location+1);
      cpu.r.y = (high_byte<<8) | low_byte;
      cpu.p.n = cpu.r.y >> 15;
    }
    if(cpu.r.y===0) {
      cpu.p.z = 1; 
    } else {
      cpu.p.z = 0;
    }
  } 
};

var LDY_direct_page = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d; 
    if(cpu.p.x) {
      cpu.r.y = cpu.mmu.read_byte(location);
      cpu.p.n = cpu.r.y >> 7;
    } else {
      var low_byte = cpu.mmu.read_byte(location); 
      var high_byte = cpu.mmu.read_byte(location+1);
      cpu.r.y = (high_byte<<8) | low_byte;
      cpu.p.n = cpu.r.y >> 15;
    } 
    if(cpu.r.y===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var DEX = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    if(cpu.r.x===0) {
      if(cpu.p.x) {
        cpu.r.x = 0xff;
      } else {
        cpu.r.x = 0xffff;
      }
      cpu.p.n = 1;
      cpu.p.z = 0; 
    } else {
      cpu.r.x--;
      if(cpu.p.x) {
        cpu.p.n = cpu.r.x >> 7;
      } else {
        cpu.p.n = cpu.r.x >> 15;
      }

      if(cpu.r.x===0) {
        cpu.p.z = 1;
      } else {
        cpu.p.z = 0;
      }
    }
  }
};

var DEY = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    if(cpu.r.y===0) {
      if(cpu.p.x) {
        cpu.r.y = 0xff;
      } else {
        cpu.r.y = 0xffff; 
      }
      cpu.p.n = 1;
      cpu.p.z = 0;
    } else {
      cpu.r.y--;

      if(cpu.p.x) {
        cpu.p.n = cpu.r.y >> 7;
      } else {
        cpu.p.n = cpu.r.y >> 15;
      }

      if(cpu.r.y===0) {
        cpu.p.z = 1;
      } else {
        cpu.p.z = 0;
      }
    }
  }
};

var DEC_accumulator = {
  bytes_required: function() {
    return 1;
  },
  execute: function(cpu) {
    if(cpu.r.a===0) {
      if(cpu.p.x) {
        cpu.r.a = 0xff;
      } else {
        cpu.r.a = 0xffff;
      }
      cpu.p.n = 1;
      cpu.p.z = 0;
    } else {
      cpu.r.a--; 
      if(cpu.p.x) {
        cpu.r.a &= 0xff;   
        cpu.p.n = cpu.r.a >> 7;
      } else {
        cpu.r.a &= 0xffff;
        cpu.p.n = cpu.r.a >> 15;
      }

      if(cpu.r.a===0) {
        cpu.p.z = 1;
      } else {
        cpu.p.z = 0;
      }
    }
  } 
};

var DEC_absolute = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0]
    var temp;
    if(cpu.p.m) {
      temp = cpu.mmu.read_byte(location);
      if(temp===0) {
        cpu.mmu.store_byte(location, 0xff);
        cpu.p.n = 1; 
        cpu.p.z = 0;
      } else {
        temp--;
        cpu.mmu.store_byte(location, temp);
        cpu.p.n = temp >> 7;
        if(temp===0) {
          cpu.p.z = 1; 
        } else {
          cpu.p.z = 0;
        }
      }
    } else {
      var low_byte = cpu.mmu.read_byte(location); 
      var high_byte = cpu.mmu.read_byte(location+1);
      temp = (high_byte<<8) | low_byte;
      if(temp===0) {
        temp = 0xffff;
        cpu.p.n = 1;
        cpu.p.z = 0;
      } else {
        temp--;
        cpu.p.n = temp >> 15;
        if(temp===0) { 
          cpu.p.z = 1;
        } else {
          cpu.p.z = 0; 
        }
      }
      high_byte = temp >> 8;
      low_byte = temp & 0x00ff;
      cpu.mmu.store_byte(location, low_byte);
      cpu.mmu.store_byte(location+1, high_byte);
    }
  }
};

var DEC_direct_page = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var temp;
    if(cpu.p.m) {
      temp = cpu.mmu.read_byte(location);
      if(temp===0) {
        cpu.mmu.store_byte(location, 0xff);
        cpu.p.n = 1;
        cpu.p.z = 0;
      } else {
        temp--;
        cpu.mmu.store_byte(location, temp);
        cpu.p.n = temp >> 7;
        if(temp===0) {
          cpu.p.z = 1;
        } else { 
          cpu.p.z = 0; 
        }
      }
    } else {
      var low_byte = cpu.mmu.read_byte(location); 
      var high_byte = cpu.mmu.read_byte(location+1);
      temp = (high_byte<<8) | low_byte;
      if(temp===0) {
        temp = 0xffff;
        cpu.p.n = 1;
        cpu.p.z = 0;
      } else {
        temp--;
        cpu.p.n = temp >> 15;
        if(temp===0) { 
          cpu.p.z = 1;
        } else {
          cpu.p.z = 0;
        }
      }
      high_byte = temp >> 8;
      low_byte = temp & 0x00ff;
      cpu.mmu.store_byte(location, low_byte);
      cpu.mmu.store_byte(location+1, high_byte);
    }
  }
};

var INX = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.r.x++;
    
    if(cpu.p.x) {
      cpu.r.x &= 0xff;
      cpu.p.n = cpu.r.x >> 7;
    } else {
      cpu.r.x &= 0xffff;
      cpu.p.n = cpu.r.x >> 15;
    }

    if(cpu.r.x===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var INY = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.r.y++;
    if(cpu.p.x) {
      cpu.r.y &= 0xff;
      cpu.p.n = cpu.r.y >> 7;
    } else {
      cpu.r.y &= 0xffff;
      cpu.p.n = cpu.r.y >> 15;
    }

    if(cpu.r.y===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var INC_accumulator = {
  bytes_required: function() {
    return 1;
  },
  execute: function(cpu) {
    cpu.r.a++; 
    if(cpu.p.m) {
      cpu.r.a &= 0xff;
      cpu.p.n = cpu.r.a >> 7;
    } else {
      cpu.r.a &= 0xffff;
      cpu.p.n = cpu.r.a >> 15;
    }

    if(cpu.r.a===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  } 
};

var INC_absolute = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0]
    var temp;
    if(cpu.p.m) {
      temp = cpu.mmu.read_byte(location) + 1; 
      temp &= 0xff;
      cpu.p.n = temp >> 7;
      cpu.mmu.store_byte(location, temp);
      if(temp===0) {
        cpu.p.z = 1;
      } else {
        cpu.p.z = 0;
      }
    } else {
      var low_byte = cpu.mmu.read_byte(location); 
      var high_byte = cpu.mmu.read_byte(location+1);
      temp = (high_byte<<8) | low_byte;
      temp++;
      cpu.p.n = temp >> 15;
      high_byte = temp >> 8;
      low_byte = temp & 0x00ff;
      cpu.mmu.store_byte(location, low_byte);
      cpu.mmu.store_byte(location+1, high_byte);
      if(((high_byte<<8)|low_byte)===0) { 
        cpu.p.z = 1;
      } else {
        cpu.p.z = 0; 
      }
    }
  }
};

var INC_direct_page = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var temp;
    if(cpu.p.m) {
      temp = cpu.mmu.read_byte(location) + 1; 
      temp &= 0xff;
      cpu.mmu.store_byte(location, temp);
      cpu.p.n = temp >> 7;
      if(temp===0) {
        cpu.p.z = 1;
      } else {
        cpu.p.z = 0;
     }
    } else {
      var low_byte = cpu.mmu.read_byte(location); 
      var high_byte = cpu.mmu.read_byte(location+1);
      temp = (high_byte<<8) | low_byte;
      temp++;
      cpu.p.n = temp >> 15;
      high_byte = temp >> 8;
      low_byte = temp & 0x00ff;
      cpu.mmu.store_byte(location, low_byte);
      cpu.mmu.store_byte(location+1, high_byte);
      if(((high_byte<<8)|low_byte)===0) { 
        cpu.p.z = 1;
      } else {
        cpu.p.z = 0;
      }
    }
  }
};

var STA_direct_page_indexed_x = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    var location = bytes[0]+cpu.p.d+cpu.r.x;
    if(cpu.p.m) {
      cpu.mmu.store_byte(location, cpu.r.a);
    } else {
      var high_byte = cpu.r.a >> 8;
      var low_byte = cpu.r.a & 0x00ff;
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
    if(cpu.p.m) {
      cpu.mmu.store_byte(location, cpu.r.a);
    } else {
      var high_byte = cpu.r.a >> 8;
      var low_byte = cpu.r.a & 0x00ff;
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
    if(cpu.p.m) {
      cpu.mmu.store_byte(location, cpu.r.a);
    } else {
      var high_byte = cpu.r.a >> 8;
      var low_byte = cpu.r.a & 0x00ff;
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
    if(cpu.p.m) {
      cpu.mmu.store_byte(location, cpu.r.a);
    } else {
      var high_byte = cpu.r.a >> 8;
      var low_byte = cpu.r.a & 0x00ff;
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
    if(cpu.p.x) {
      cpu.mmu.store_byte(location, cpu.r.y);
    } else {
      var high_byte = cpu.r.y >> 8;
      var low_byte = cpu.r.y & 0x00ff;
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
    if(cpu.p.x) {
      cpu.mmu.store_byte(location, cpu.r.y);
    } else {
      var high_byte = cpu.r.y >> 8;
      var low_byte = cpu.r.y & 0x00ff;
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
    if(cpu.p.x) {
      cpu.mmu.store_byte(location, cpu.r.y);
    } else {
      var high_byte = cpu.r.y >> 8;
      var low_byte = cpu.r.y & 0x00ff;
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
      var high_byte = cpu.r.x >> 8;
      var low_byte = cpu.r.x & 0x00ff;
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
    if(cpu.p.x) {
      cpu.mmu.store_byte(location, cpu.r.x);
    } else {
      var high_byte = cpu.r.x >> 8;
      var low_byte = cpu.r.x & 0x00ff;
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
    if(cpu.p.x) {
      cpu.mmu.store_byte(location, cpu.r.x);
    } else {
      var high_byte = cpu.r.x >> 8;
      var low_byte = cpu.r.x & 0x00ff;
      cpu.mmu.store_byte(location, low_byte);
      cpu.mmu.store_byte(location+1, high_byte); 
    } 
  }
};

var STA_absolute_long = {
  bytes_required: function() {
    return 4;
  },
  execute: function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.m) {
      cpu.mmu.store_byte_long(location, bytes[2], cpu.r.a);
    } else {
      var high_byte = cpu.r.a >> 8;
      var low_byte = cpu.r.a & 0x00ff;
      cpu.mmu.store_byte_long(location, bytes[2], low_byte);
      cpu.mmu.store_byte_long(location+1, bytes[2], high_byte); 
    }
  }
};

var STA_absolute = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.m) {
      cpu.mmu.store_byte(location, cpu.r.a);
    } else {
      var high_byte = cpu.r.a >> 8;
      var low_byte = cpu.r.a & 0x00ff;
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
    if(cpu.p.x) {
      cpu.r.x = cpu.mmu.read_byte(location);
      cpu.p.n = cpu.r.x >> 7;
    } else {
      var low_byte = cpu.mmu.read_byte(location); 
      var high_byte = cpu.mmu.read_byte(location+1);
      cpu.r.x = (high_byte<<8) | low_byte;
      cpu.p.n = cpu.r.x >> 15;
    }
    if(cpu.r.x===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var LDX_direct_page_indexed_y = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    var location = cpu.r.d + bytes[0] + cpu.r.y;
    if(cpu.p.x) {
      cpu.r.x = cpu.mmu.read_byte(location);       
      cpu.p.n = cpu.r.x >> 7;
    } else {
      // Check for overflow.
      var overflow_check = location - 0xffff;
      if(overflow_check > 0) {
        location = overflow_check-1; 
      }
      var low_byte = cpu.mmu.read_byte(location); 
      // Check for potential overflow again.
      if(location===0xffff) {
       location = 0;
      } else {
        location++;
      }
      var high_byte = cpu.mmu.read_byte(location);
      cpu.r.x = (high_byte<<8) | low_byte;
      cpu.p.n = cpu.r.x >> 15;
    }
    if(cpu.r.x===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }

};

var LDA_direct_page = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d; 
    if(cpu.p.m) {
      cpu.r.a = cpu.mmu.read_byte(location);
      cpu.p.n = cpu.r.a >> 7;
    } else {
      var low_byte = cpu.mmu.read_byte(location); 
      var high_byte = cpu.mmu.read_byte(location+1);
      cpu.r.a = (high_byte<<8) | low_byte;
      cpu.p.n = cpu.r.a >> 15;
    } 
    if(cpu.r.a===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var LDX_absolute_indexed_y = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0])+cpu.r.y;
    if(cpu.p.x) {
      cpu.r.x = cpu.mmu.read_byte(location);
      cpu.p.n = cpu.r.x >> 7;
    } else {
      var low_byte = cpu.mmu.read_byte(location); 
      var high_byte = cpu.mmu.read_byte(location+1);
      cpu.r.x = (high_byte<<8) | low_byte;
      cpu.p.n = cpu.r.x >> 15;
    }
    if(cpu.r.x===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var LDX_absolute = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.x) {
      cpu.r.x = cpu.mmu.read_byte(location);
      cpu.p.n = cpu.r.x >> 7;
    } else {
      var low_byte = cpu.mmu.read_byte(location); 
      var high_byte = cpu.mmu.read_byte(location+1);
      cpu.r.x = (high_byte<<8) | low_byte; 
      cpu.p.n = cpu.r.x >> 15;
    }
    if(cpu.r.x===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var LDA_absolute_long = {
  bytes_required: function() {
    return 4;
  },
  execute: function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.m) {
      cpu.r.a = cpu.mmu.read_byte_long(location, bytes[2]);
      cpu.p.n = cpu.r.a >> 7;
    } else {
      var low_byte = cpu.mmu.read_byte_long(location, bytes[2]); 
      var high_byte = cpu.mmu.read_byte_long(location+1, bytes[2]);
      cpu.r.a = (high_byte<<8) | low_byte;
      cpu.p.n = cpu.r.a >> 15;
    }
    if(cpu.r.a===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
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
      cpu.p.n = cpu.r.a >> 7;
    } else {
      var low_byte = cpu.mmu.read_byte(location); 
      var high_byte = cpu.mmu.read_byte(location+1);
      cpu.r.a = (high_byte<<8) | low_byte;
      cpu.p.n = cpu.r.a >> 15;
    }
    if(cpu.r.a===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
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
      cpu.p.n = cpu.r.a >> 15;
    } else {
      cpu.r.a = bytes[0];  
      cpu.p.n = cpu.r.a >> 7;
    }
    if(cpu.r.a===0) {
      cpu.p.z = 1;      
    } else {
      cpu.p.z = 0;
    }
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
      cpu.p.n = cpu.r.x >> 15;
    } else {
      cpu.r.x = bytes[0];  
      cpu.p.n = cpu.r.x >> 7;
    }
    if(cpu.r.x===0) {
      cpu.p.z = 1; 
    } else {
      cpu.p.z = 0;
    }
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

    var ops = { 0: function() { cpu.p.n = 1; }, 1: function() { cpu.p.v = 1; },
                2: function() { cpu.p.m = 1; }, 3: function() { cpu.p.x = 1; },
                4: function() { cpu.p.d = 1; }, 5: function() { cpu.p.i = 1; },
                6: function() { cpu.p.z = 1; }, 7: function() { cpu.p.c = 1; }};

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

    var ops = { 0: function() { cpu.p.n = 0; }, 1: function() { cpu.p.v = 0; },
                2: function() { cpu.p.m = 0; }, 3: function() { cpu.p.x = 0; },
                4: function() { cpu.p.d = 0; }, 5: function() { cpu.p.i = 0; },
                6: function() { cpu.p.z = 0; }, 7: function() { cpu.p.c = 0; }};
 
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
    if(cpu.p.e) {
      // Switching to emulation mode.
      var high_byte = cpu.r.a >> 8;
      var low_byte = cpu.r.a & 0x00ff;
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
