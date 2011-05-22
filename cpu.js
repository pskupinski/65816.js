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
    s:0xff,  // Stack Pointer
    pc:0,    // Program Counter
    dbr:0,   // Data Bank Register
    k:0      // Program Bank Register
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

  this.interrupt = 0; // 0 = no interrupt. 1 = NMI. 2 = RESET. 3 = ABORT.
                      // 4 = COP. 5 = IRQ. 6 = BRK.
 
  this.mmu = MMU;
  this.mmu.cpu = this; 

  this.opcode_map = { 0xfb : XCE, 0x18 : CLC, 0x78 : SEI, 0x38 : SEC,
                      0x58 : CLI, 0xc2 : REP, 0xe2 : SEP, 0xd8 : CLD,
                      0xf8 : SED, 0xb8 : CLV, 0xeb : XBA, 0xa9 : LDA_const, 
                      0xad : LDA_absolute, 0xaf : LDA_absolute_long, 
                      0xbf : LDA_absolute_long_indexed_x,
                      0xa5 : LDA_direct_page, 0xbd : LDA_absolute_indexed_x,
                      0xb9 : LDA_absolute_indexed_y,
                      0xb2 : LDA_direct_page_indirect,
                      0xa7 : LDA_direct_page_indirect_long,
                      0xb7 : LDA_direct_page_indirect_long_indexed_y,
                      0xb1 : LDA_direct_page_indirect_indexed_y,
                      0xa3 : LDA_stack_relative,
                      0xb3 : LDA_stack_relative_indirect_indexed_y,
                      0xa2 : LDX_const, 
                      0xae : LDX_absolute, 0xa6 : LDX_direct_page,
                      0xa0 : LDY_const, 0xbc : LDY_absolute_indexed_x,
                      0xb4 : LDY_direct_page_indexed_x,
                      0xbe : LDX_absolute_indexed_y,
                      0xb6 : LDX_direct_page_indexed_y,
                      0xac : LDY_absolute, 0xa4 : LDY_direct_page, 0xea : NOP,
                      0x8d : STA_absolute, 0x85 : STA_direct_page,
                      0x8f : STA_absolute_long, 
                      0x9f : STA_absolute_long_indexed_x,
                      0x92 : STA_direct_page_indirect,
                      0x87 : STA_direct_page_indirect_long,
                      0x97 : STA_direct_page_indirect_long_indexed_y,
                      0x91 : STA_direct_page_indirect_indexed_y,
                      0x9d : STA_absolute_indexed_x, 
                      0x99 : STA_absolute_indexed_y,
                      0x95 : STA_direct_page_indexed_x, 
                      0x83 : STA_stack_relative,
                      0x93 : STA_stack_relative_indirect_indexed_y,
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
                      0x98 : TYA, 0x5b : TCD, 0x7b : TDC, 0x1b : TCS,
                      0x3b : TSC, 0x4c : JMP_absolute, 
                      0x6c : JMP_absolute_indirect, 0x80 : BRA, 0x82 : BRL,
                      0xf0 : BEQ, 0xd0 : BNE, 0x90 : BCC, 0xb0 : BCS,
                      0x50 : BVC, 0x70 : BVS, 0x10 : BPL, 0x30 : BMI,
                      0x69 : ADC_const, 0x6d : ADC_absolute, 
                      0x6f : ADC_absolute_long,
                      0x7f : ADC_absolute_long_indexed_x,
                      0x65 : ADC_direct_page, 0x72 : ADC_direct_page_indirect,
                      0x67 : ADC_direct_page_indirect_long,
                      0x77 : ADC_direct_page_indirect_long_indexed_y,
                      0x71 : ADC_direct_page_indirect_indexed_y,
                      0x7d : ADC_absolute_indexed_x, 
                      0x79 : ADC_absolute_indexed_y,
                      0x75 : ADC_direct_page_indexed_x, 
                      0x63 : ADC_stack_relative, 
                      0x73 : ADC_stack_relative_indirect_indexed_y, 
                      0xe9 : SBC_const,
                      0xed : SBC_absolute, 0xe5 : SBC_direct_page,
                      0xef : SBC_absolute_long,
                      0xff : SBC_absolute_long_indexed_x,
                      0xf2 : SBC_direct_page_indirect, 
                      0xe7 : SBC_direct_page_indirect_long,
                      0xf7 : SBC_direct_page_indirect_long_indexed_y,
                      0xf1 : SBC_direct_page_indirect_indexed_y,
                      0xfd : SBC_absolute_indexed_x, 
                      0xf9 : SBC_absolute_indexed_y,
                      0xe1 : SBC_direct_page_indexed_x,
                      0xe3 : SBC_stack_relative,
                      0xf3 : SBC_stack_relative_indirect_indexed_y,
                      0xc9 : CMP_const, 0xc5 : CMP_direct_page,
                      0xcd : CMP_absolute, 0xd2 : CMP_direct_page_indirect,
                      0xcf : CMP_absolute_long,
                      0xdf : CMP_absolute_long_indexed_x,
                      0xc7 : CMP_direct_page_indirect_long,
                      0xd7 : CMP_direct_page_indirect_long_indexed_y,
                      0xd5 : CMP_direct_page_indexed_x,
                      0xdd : CMP_absolute_indexed_x,
                      0xd9 : CMP_absolute_indexed_y,
                      0xd1 : CMP_direct_page_indirect_indexed_y, 
                      0xc3 : CMP_stack_relative,
                      0xd3 : CMP_stack_relative_indirect_indexed_y,
                      0xe0 : CPX_const, 
                      0xec : CPX_absolute, 0xe4 : CPX_direct_page, 
                      0xc0 : CPY_const, 0xcc : CPY_absolute,
                      0xc4 : CPY_direct_page, 0x29 : AND_const,
                      0x2d : AND_absolute, 0x25 : AND_direct_page,
                      0x2f : AND_absolute_long,
                      0x3f : AND_absolute_long_indexed_x,
                      0x32 : AND_direct_page_indirect,
                      0x27 : AND_direct_page_indirect_long,
                      0x37 : AND_direct_page_indirect_long_indexed_y,
                      0x31 : AND_direct_page_indirect_indexed_y,
                      0x3d : AND_absolute_indexed_x,
                      0x39 : AND_absolute_indexed_y,
                      0x35 : AND_direct_page_indexed_x, 
                      0x23 : AND_stack_relative, 
                      0x33 : AND_stack_relative_indirect_indexed_y,
                      0x09 : ORA_const, 0x0f : ORA_absolute_long,
                      0x0d : ORA_absolute, 0x05 : ORA_direct_page,
                      0x1f : ORA_absolute_long_indexed_x,
                      0x12 : ORA_direct_page_indirect, 
                      0x07 : ORA_direct_page_indirect_long,
                      0x17 : ORA_direct_page_indirect_long_indexed_y,
                      0x11 : ORA_direct_page_indirect_indexed_y,
                      0x1d : ORA_absolute_indexed_x, 
                      0x1f : ORA_absolute_indexed_y,
                      0x15 : ORA_direct_page_indexed_x,
                      0x03 : ORA_stack_relative,
                      0x13 : ORA_stack_relative_indirect_indexed_y,
                      0x49 : EOR_const, 0x4d : EOR_absolute,
                      0x4f : EOR_absolute_long,
                      0x5f : EOR_absolute_long_indexed_x,
                      0x45 : EOR_direct_page, 
                      0x52 : EOR_direct_page_indirect,
                      0x47 : EOR_direct_page_indirect_long,
                      0x57 : EOR_direct_page_indirect_long_indexed_y,
                      0x51 : EOR_direct_page_indirect_indexed_y,
                      0x5d : EOR_absolute_indexed_x,
                      0x59 : EOR_absolute_indexed_y,
                      0x55 : EOR_direct_page_indexed_x, 
                      0x43 : EOR_stack_relative,
                      0x53 : EOR_stack_relative_indirect_indexed_y,
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
                      0xf4 : PEA, 0xd4 : PEI, 0x8b : PHB, 0xab : PLB,
                      0x4b : PHK, 0x0b : PHD, 0x2b : PLD, 0x62 : PER,
                      0x20 : JSR, 0x60 : RTS, 0x22 : JSL, 0x6b : RTL,
                      0x54 : MVN, 0x44 : MVP, 0x00 : BRK, 0x40 : RTI,
                      0x02 : COP };

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
      if(this.interrupt&&(!this.p.i|(this.interrupt===1))) {
        // Load the related interrupt vector in page 0xff of bank zero.
        if(!this.p.e) {
          this.mmu.push_byte(this.r.k); 
        }
        this.mmu.push_byte(this.r.pc>>8);
        this.mmu.push_byte(this.r.pc&0xff);
        var p_byte = (cpu.p.n<<7)|(cpu.p.v<<6)|(cpu.p.m<<5)|(cpu.p.x<<4)|
                    (cpu.p.d<<3)|(cpu.p.i<<2)|(cpu.p.z<<1)|cpu.p.c;
        cpu.mmu.push_byte(p_byte);
        if(!this.p.e) 
          this.p.d = 0;
        this.p.i = 1;
        this.r.k = 0;
       
        // Look for where to jump to for the interrupt.  
        if(this.p.e) {
          // NMI
          if(this.interrupt===1) {
            var low_byte = this.mmu.read_byte_long(0xfffa, 0);
            var high_byte = this.mmu.read_byte_long(0xfffb, 0);  
            this.r.pc = (high_byte<<8)|low_byte;
          // RESET
          } else if(this.interrupt===2) {
            var low_byte = this.mmu.read_byte_long(0xfffc, 0);
            var high_byte = this.mmu.read_byte_long(0xfffd, 0);  
            this.r.pc = (high_byte<<8)|low_byte;
          // ABORT
          } else if(this.interrupt===3) {
            var low_byte = this.mmu.read_byte_long(0xfff8, 0);
            var high_byte = this.mmu.read_byte_long(0xfff9, 0);  
            this.r.pc = (high_byte<<8)|low_byte;
          // COP
          } else if(this.interrupt===4) {
            var low_byte = this.mmu.read_byte_long(0xfff4, 0);
            var high_byte = this.mmu.read_byte_long(0xfff5, 0);  
            this.r.pc = (high_byte<<8)|low_byte;
          // IRQ or BRK
          } else if(this.interrupt===5|this.interrupt==6) {
            var low_byte = this.mmu.read_byte_long(0xfffe, 0);
            var high_byte = this.mmu.read_byte_long(0xffff, 0);  
            this.r.pc = (high_byte<<8)|low_byte;
          }
        } else {
          // NMI
          if(this.interrupt===1) {
            var low_byte = this.mmu.read_byte_long(0xffea, 0);
            var high_byte = this.mmu.read_byte_long(0xffeb, 0);  
            this.r.pc = (high_byte<<8)|low_byte;
          // ABORT
          } else if(this.interrupt===3) {
            var low_byte = this.mmu.read_byte_long(0xffe8, 0);
            var high_byte = this.mmu.read_byte_long(0xffe9, 0);  
            this.r.pc = (high_byte<<8)|low_byte;
          // COP
          } else if(this.interrupt===4) {
            var low_byte = this.mmu.read_byte_long(0xffe4, 0);
            var high_byte = this.mmu.read_byte_long(0xffe5, 0);  
            this.r.pc = (high_byte<<8)|low_byte;
          // IRQ
          } else if(this.interrupt===5) {
            var low_byte = this.mmu.read_byte_long(0xffee, 0);
            var high_byte = this.mmu.read_byte_long(0xffef, 0);  
            this.r.pc = (high_byte<<8)|low_byte;
          // BRK
          } else if(this.interrupt===6) {
            var low_byte = this.mmu.read_byte_long(0xffe6, 0);
            var high_byte = this.mmu.read_byte_long(0xffe7, 0);  
            this.r.pc = (high_byte<<8)|low_byte;
          }
        }

        this.interrupt = 0;
      }
 
      var b = this.mmu.read_byte_long(this.r.pc, this.r.k); 
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

  pull_byte: function() {
    if(this.cpu.p.e) {
      if(this.cpu.r.s===0xff) {
        this.cpu.r.s = 0;
        return this.memory[this.cpu.r.dbr][0x100|this.cpu.r.s]; 
      } else {
        return this.memory[this.cpu.r.dbr][0x100|(++this.cpu.r.s)];
      }
    } else {
      return this.memory[this.cpu.r.dbr][++this.cpu.r.s];
    }
  },

  push_byte: function(b) {
    if(this.cpu.p.e) {
      if(this.cpu.r.s===0) {
        this.memory[this.cpu.r.dbr][0x100|this.cpu.r.s] = b;
        this.cpu.r.s = 0xff;
      } else {
        this.memory[this.cpu.r.dbr][0x100|(this.cpu.r.s--)] = b;
      }
    } else {
      this.memory[this.cpu.r.dbr][this.cpu.r.s--] = b;
    }
  },

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

var COP = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu) {
    cpu.interrupt = 4;
  }
};

var BRK = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu) {
    cpu.interrupt = 6;
    if(cpu.p.e) 
      cpu.p.m = 1;
  }
};

var RTI = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    var p_byte = cpu.mmu.pull_byte();
    var pc_low = cpu.mmu.pull_byte();
    var pc_high = cpu.mmu.pull_byte();
    cpu.r.pc = (pc_high<<8)|pc_low;

    cpu.p.c = p_byte & 0x01;
    cpu.p.z = (p_byte & 0x02) >> 1;
    cpu.p.i = (p_byte & 0x04) >> 2;
    cpu.p.d = (p_byte & 0x08) >> 3;
    cpu.p.x = (p_byte & 0x10) >> 4;
    cpu.p.m = (p_byte & 0x20) >> 5;
    cpu.p.v = (p_byte & 0x40) >> 6;
    cpu.p.n = p_byte >> 7;

    if(!cpu.p.e) {
      cpu.r.k = cpu.mmu.pull_byte();
    }
  }
};

// MVN is a really weird instruction, until the accumulator underflows MVN
// will keep decrementing the program counter to have it continue to execute.
var MVN = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    // TODO: One piece of reference material I've read claims that this 
    // operation should always work with a 16-bit accumulator even if in 
    // emulation mode or the m bit is set to 1, in those cases it claims that
    // you should concatenate the B "hidden" register with A.  I'm going to
    // need to test this claim out somehow.
    var b = cpu.mmu.read_byte_long(cpu.r.x,bytes[1]);
    cpu.r.dbr = bytes[0];
    cpu.mmu.store_byte(cpu.r.y, b); 
    cpu.r.x++;
    cpu.r.y++;
    if(cpu.p.e|cpu.p.x) {
      cpu.r.x &= 0x00ff;
      cpu.r.y &= 0x00ff;
    } else {
      cpu.r.x &= 0xffff;
      cpu.r.y &= 0xffff;
    }
   
    if(cpu.r.a!=0) {
      cpu.r.a--;
      cpu.r.pc-=3;
    } else {
      if(cpu.p.e|cpu.p.m)
        cpu.r.a = 0xff; 
      else
        cpu.r.a = 0xffff;
    }
  }
};

// MVP is a really weird instruction, until the accumulator reaches $FFFF MVP
// will keep decrementing the program counter to have it continue to execute.
var MVP = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    // TODO: One piece of reference material I've read claims that this 
    // operation should always work with a 16-bit accumulator even if in 
    // emulation mode or the m bit is set to 1, in those cases it claims that
    // you should concatenate the B "hidden" register with A.  I'm going to
    // need to test this claim out somehow.
    var b = cpu.mmu.read_byte_long(cpu.r.x,bytes[1]);
    cpu.r.dbr = bytes[0];
    cpu.mmu.store_byte(cpu.r.y,b); 

    var index_register_wrap;
    if(cpu.p.e|cpu.p.x) {
      index_register_wrap = 0xff;
    } else {
      index_register_wrap = 0xffff;
    }

    if(cpu.r.y===index_register_wrap) {
      cpu.r.y = 0;  
    } else {
      cpu.r.y--;
    }

    if(cpu.r.x===index_register_wrap) {
      cpu.r.x = 0;
    } else {
      cpu.r.x--;
    }
   
    if(cpu.r.a!=0) {
      cpu.r.pc-=3;
      cpu.r.a--;
    } else {
      if(cpu.p.e|cpu.p.m)
        cpu.r.a = 0xff; 
      else
        cpu.r.a = 0xffff;
    }
  }
};

var JSL = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    var location = cpu.r.pc - 1;
    var low_byte = location & 0x00ff;
    var high_byte = location >> 8;
    cpu.mmu.push_byte(cpu.r.k);
    cpu.mmu.push_byte(high_byte);
    cpu.mmu.push_byte(low_byte);
    cpu.r.k = bytes[2];
    cpu.r.pc = (bytes[1]<<8)|bytes[0];
  }
};

var RTL = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    var low_byte = cpu.mmu.pull_byte();
    var high_byte = cpu.mmu.pull_byte();
    cpu.r.k = cpu.mmu.pull_byte();
    cpu.r.pc = ((high_byte<<8)|low_byte) + 1;
  }
};

var JSR = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = cpu.r.pc - 1;
    var low_byte = location & 0x00ff;
    var high_byte = location >> 8;
    cpu.mmu.push_byte(high_byte);
    cpu.mmu.push_byte(low_byte);
    cpu.r.pc = (bytes[1]<<8)|bytes[0];    
  }
};

var RTS = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    var low_byte = cpu.mmu.pull_byte();
    var high_byte = cpu.mmu.pull_byte();
    cpu.r.pc = ((high_byte<<8)|low_byte) + 1;  
  }
};

var PER = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu,bytes) {
    var address = ((bytes[1]<<8)|bytes[0]) + cpu.r.pc;
    var low_byte = address & 0x00ff;
    var high_byte = address >> 8;
    cpu.mmu.push_byte(high_byte);
    cpu.mmu.push_byte(low_byte);
  }
};

var PHK = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.mmu.push_byte(cpu.r.k);
  }
};

var PHD = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    var low_byte = cpu.r.d & 0x00ff;
    var high_byte = cpu.r.d >> 8;
    cpu.mmu.push_byte(high_byte);
    cpu.mmu.push_byte(low_byte); 
  }
};

var PLD = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    var low_byte = cpu.mmu.pull_byte();
    var high_byte = cpu.mmu.pull_byte();
    cpu.r.d = (high_byte<<8)|low_byte;
    
    cpu.p.n = cpu.r.d >> 15;  

    if(cpu.r.d===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var PHB = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.mmu.push_byte(cpu.r.dbr);
  }
};

var PLB = {
   bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.r.dbr = cpu.mmu.pull_byte();
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
    cpu.mmu.push_byte(bytes[1]);
    cpu.mmu.push_byte(bytes[0]);
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
    cpu.mmu.push_byte(high_byte);
    cpu.mmu.push_byte(low_byte);
  }
};

var PHP = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    var p_byte = (cpu.p.n<<7)|(cpu.p.v<<6)|(cpu.p.m<<5)|(cpu.p.x<<4)|
                 (cpu.p.d<<3)|(cpu.p.i<<2)|(cpu.p.z<<1)|cpu.p.c;
    cpu.mmu.push_byte(p_byte);
  }
};

var PLP = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    var p_byte = cpu.mmu.pull_byte();
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
    if(cpu.p.e|cpu.p.x) {
      cpu.mmu.push_byte(cpu.r.x);
    } else {
      var low_byte = cpu.r.x & 0x00ff;
      var high_byte = cpu.r.x >> 8;
      cpu.mmu.push_byte(high_byte);
      cpu.mmu.push_byte(low_byte);
    }
  }
};

var PLX = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    if(cpu.p.e|cpu.p.x) {
      cpu.r.x = cpu.mmu.pull_byte();
      cpu.p.n = cpu.r.x >> 7;
    } else {
      var low_byte = cpu.mmu.pull_byte();
      var high_byte = cpu.mmu.pull_byte();
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
    if(cpu.p.e|cpu.p.x) {
      cpu.mmu.push_byte(cpu.r.y);
    } else {
      var low_byte = cpu.r.y & 0x00ff;
      var high_byte = cpu.r.y >> 8;
      cpu.mmu.push_byte(high_byte);
      cpu.mmu.push_byte(low_byte);
    }
  }
};

var PLY = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    if(cpu.p.e|cpu.p.x) {
      cpu.r.y = cpu.mmu.pull_byte();
      cpu.p.n = cpu.r.y >> 7;
    } else {
      var low_byte = cpu.mmu.pull_byte();
      var high_byte = cpu.mmu.pull_byte();
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
    if(cpu.p.e|cpu.p.m) {
      cpu.mmu.push_byte(cpu.r.a);
    } else {
      var low_byte = cpu.r.a & 0x00ff;
      var high_byte = cpu.r.a >> 8;
      cpu.mmu.push_byte(high_byte);
      cpu.mmu.push_byte(low_byte);
    }
  }
};

var PLA = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    if(cpu.p.e|cpu.p.m) {
      cpu.r.a = cpu.mmu.pull_byte();
      cpu.p.n = cpu.r.a >> 7;
    } else {
      var low_byte = cpu.mmu.pull_byte();
      var high_byte = cpu.mmu.pull_byte();
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
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
    cpu.p.c = cpu.r.a & 1;   
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
      return 2;
    } else {
      return 3; 
    }
  },
  execute:function(cpu, bytes) {
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
      EOR_const.execute(cpu, [cpu.mmu.read_byte(location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      EOR_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var EOR_absolute_long = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.e|cpu.p.m) {
      EOR_const.execute(cpu, [cpu.mmu.read_byte_long(location, bytes[2])]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(location, bytes[2]);
      var high_byte = cpu.mmu.read_byte_long(location+1, bytes[2]);
      EOR_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var EOR_absolute_long_indexed_x = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0]) + cpu.r.x;
    if(location & 0x10000) {
      bytes[2]++;
      location &= 0xffff;      
    }

    if(cpu.p.e|cpu.p.m) {
      EOR_const.execute(cpu, [cpu.mmu.read_byte_long(location, bytes[2])]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(location, bytes[2]);
      location++;
      if(location & 0x10000) {
        bytes[2]++;
        location &= 0xffff;      
      }
      var high_byte = cpu.mmu.read_byte_long(location, bytes[2]);
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
      EOR_const.execute(cpu, [cpu.mmu.read_byte(absolute_location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(absolute_location);
      var high_byte = cpu.mmu.read_byte(absolute_location+1);
      EOR_const.execute(cpu, [low_byte, high_byte]);
    }
  } 
};

var EOR_direct_page_indirect_long_indexed_y = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var low_byte_loc = cpu.mmu.read_byte(location&0xffff);
    var high_byte_loc = cpu.mmu.read_byte((location+1)&0xffff);
    var bank_byte = cpu.mmu.read_byte((location+2)&0xffff);
    var absolute_location = ((high_byte_loc<<8) | low_byte_loc) + cpu.r.y;
    if(absolute_location >> 16) {
      absolute_location &= 0xffff;
      bank_byte++;
    }
    if(cpu.p.e|cpu.p.m) {
      EOR_const.execute(cpu, [cpu.mmu.read_byte_long(absolute_location, bank_byte)]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte);
      absolute_location++;
      if(absolute_location >> 16) {
        absolute_location &= 0xffff;
        bank_byte++;
      }
      var high_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte);
      EOR_const.execute(cpu, [low_byte, high_byte]);
    }
  } 
};

var EOR_direct_page_indirect_long = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var low_byte_loc = cpu.mmu.read_byte(location&0xffff);
    var high_byte_loc = cpu.mmu.read_byte((location+1)&0xffff);
    var bank_byte = cpu.mmu.read_byte((location+2)&0xffff);
    var absolute_location = (high_byte_loc<<8) | low_byte_loc;
    if(cpu.p.e|cpu.p.m) {
      EOR_const.execute(cpu, [cpu.mmu.read_byte_long(absolute_location, bank_byte)]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte);
      var high_byte = cpu.mmu.read_byte_long((absolute_location+1)&0xffff, bank_byte);
      EOR_const.execute(cpu, [low_byte, high_byte]);
    }
  } 
};

var EOR_direct_page_indirect_indexed_y = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var low_byte_loc = cpu.mmu.read_byte(location);
    var high_byte_loc = cpu.mmu.read_byte(location+1);
    var absolute_location = ((high_byte_loc<<8) | low_byte_loc) + cpu.r.y;
    if(cpu.p.e|cpu.p.m) {
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

var EOR_stack_relative = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if(cpu.p.e) {
      var location = 0x100 | ((cpu.r.s + bytes[0]) & 0xff);
      EOR_const.execute(cpu, [cpu.mmu.read_byte(location)]);
    } else {
      if(cpu.p.m) {
        EOR_const.execute(cpu, [cpu.mmu.read_byte(cpu.r.s+bytes[0])]);
      } else {
        var location = cpu.r.s + bytes[0];
        var low_byte = cpu.mmu.read_byte(location);
        var high_byte = cpu.mmu.read_byte(location+1);
        EOR_const.execute(cpu, [low_byte, high_byte]); 
      } 
    }
  }
};

var EOR_stack_relative_indirect_indexed_y = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if(cpu.p.e) {
      var location_loc = 0x100 | ((cpu.r.s + bytes[0]) & 0xff);
      var low_byte =  cpu.mmu.read_byte(location_loc);
      var high_byte;
      if(location_loc===0x1ff) {
        high_byte = cpu.mmu.read_byte(0x100);
      } else {
        high_byte = cpu.mmu.read_byte(location_loc+1);
      }
      var absolute_location = ((high_byte<<8)|low_byte)+cpu.r.y;
      var b;
      if(absolute_location>=0x10000) {
        b = cpu.mmu.read_byte_long(absolute_location & 0xffff, cpu.r.dbr+1);
      } else {
        b = cpu.mmu.read_byte(absolute_location);
      }
      EOR_const.execute(cpu, [b]);
    } else {
      var location_loc = (cpu.r.s + bytes[0]) & 0xffff;
      var location_low_byte = cpu.mmu.read_byte(location);
      var location_high_byte = cpu.mmu.read_byte(location+1); 
      var absolute_location = (location_high_byte<<8)|location_low_byte;
      absolute_location += cpu.r.y;
      if(cpu.p.m) {
        var b;
        if(absolute_location>=0x10000) {
          b = cpu.mmu.read_byte_long(absolute_location & 0xffff, cpu.r.dbr+1);  
        } else {
          b = cpu.mmu.read_byte(absolute_location);
        }
        EOR_const.execute(cpu, [b]);
      } else {
        var low_byte;
        var high_byte;
        if(absolute_location>=0x10000) {
          absolute_location &= 0xffff;
          low_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
          high_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
        } else {
          low_byte = cpu.mmu.read_byte(absolute_location);
          if(absolute_location===0xffff) {
            high_byte = cpu.mmu.read_byte_long(0, cpu.r.dbr+1);
          } else {
            high_byte = cpu.mmu.read_byte(absolute_location);
          }
        }
        EOR_const.execute(cpu, [low_byte, high_byte]); 
      } 
    }
  }
};

var ORA_const = {
  bytes_required:function(cpu) {
    if(cpu.p.e|cpu.p.m) {
      return 2;
    } else {
      return 3; 
    }
  },
  execute:function(cpu, bytes) {
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
      ORA_const.execute(cpu, [cpu.mmu.read_byte(location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      ORA_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var ORA_absolute_long = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.e|cpu.p.m) {
      ORA_const.execute(cpu, [cpu.mmu.read_byte_long(location, bytes[2])]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(location, bytes[2]);
      var high_byte = cpu.mmu.read_byte_long(location+1, bytes[2]);
      ORA_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var ORA_absolute_long_indexed_x = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0]) + cpu.r.x;
    if(location & 0x10000) {
      bytes[2]++;
      location &= 0xffff;      
    }

    if(cpu.p.e|cpu.p.m) {
      ORA_const.execute(cpu, [cpu.mmu.read_byte_long(location, bytes[2])]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(location, bytes[2]);
      location++;
      if(location & 0x10000) {
        bytes[2]++;
        location &= 0xffff;      
      }
      var high_byte = cpu.mmu.read_byte_long(location, bytes[2]);
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
      ORA_const.execute(cpu, [cpu.mmu.read_byte(absolute_location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(absolute_location);
      var high_byte = cpu.mmu.read_byte(absolute_location+1);
      ORA_const.execute(cpu, [low_byte, high_byte]);
    }
  } 
};

var ORA_direct_page_indirect_long = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var low_byte_loc = cpu.mmu.read_byte(location&0xffff);
    var high_byte_loc = cpu.mmu.read_byte((location+1)&0xffff);
    var bank_byte = cpu.mmu.read_byte((location+2)&0xffff);
    var absolute_location = (high_byte_loc<<8) | low_byte_loc;
    if(cpu.p.e|cpu.p.m) {
      ORA_const.execute(cpu, [cpu.mmu.read_byte_long(absolute_location, bank_byte)]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte);
      var high_byte = cpu.mmu.read_byte_long((absolute_location+1)&0xffff, bank_byte);
      ORA_const.execute(cpu, [low_byte, high_byte]);
    }
  } 
};

var ORA_direct_page_indirect_long_indexed_y = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var low_byte_loc = cpu.mmu.read_byte(location&0xffff);
    var high_byte_loc = cpu.mmu.read_byte((location+1)&0xffff);
    var bank_byte = cpu.mmu.read_byte((location+2)&0xffff);
    var absolute_location = ((high_byte_loc<<8) | low_byte_loc) + cpu.r.y;
    if(absolute_location >> 16) {
      absolute_location &= 0xffff;
      bank_byte++;
    }
    if(cpu.p.e|cpu.p.m) {
      ORA_const.execute(cpu, [cpu.mmu.read_byte_long(absolute_location, bank_byte)]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte);
      absolute_location++;
      if(absolute_location >> 16) {
        absolute_location &= 0xffff;
        bank_byte++;
      }
      var high_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte);
      ORA_const.execute(cpu, [low_byte, high_byte]);
    }
  } 
};

var ORA_direct_page_indirect_indexed_y = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var low_byte_loc = cpu.mmu.read_byte(location);
    var high_byte_loc = cpu.mmu.read_byte(location+1);
    var absolute_location = ((high_byte_loc<<8) | low_byte_loc) + cpu.r.y;
    if(cpu.p.e|cpu.p.m) {
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

var ORA_stack_relative = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if(cpu.p.e) {
      var location = 0x100 | ((cpu.r.s + bytes[0]) & 0xff);
      ORA_const.execute(cpu, [cpu.mmu.read_byte(location)]);
    } else {
      if(cpu.p.m) {
        ORA_const.execute(cpu, [cpu.mmu.read_byte(cpu.r.s+bytes[0])]);
      } else {
        var location = cpu.r.s + bytes[0];
        var low_byte = cpu.mmu.read_byte(location);
        var high_byte = cpu.mmu.read_byte(location+1);
        ORA_const.execute(cpu, [low_byte, high_byte]); 
      } 
    }
  }
};

var ORA_stack_relative_indirect_indexed_y = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if(cpu.p.e) {
      var location_loc = 0x100 | ((cpu.r.s + bytes[0]) & 0xff);
      var low_byte =  cpu.mmu.read_byte(location_loc);
      var high_byte;
      if(location_loc===0x1ff) {
        high_byte = cpu.mmu.read_byte(0x100);
      } else {
        high_byte = cpu.mmu.read_byte(location_loc+1);
      }
      var absolute_location = ((high_byte<<8)|low_byte)+cpu.r.y;
      var b;
      if(absolute_location>=0x10000) {
        b = cpu.mmu.read_byte_long(absolute_location & 0xffff, cpu.r.dbr+1);
      } else {
        b = cpu.mmu.read_byte(absolute_location);
      }
      ORA_const.execute(cpu, [b]);
    } else {
      var location_loc = (cpu.r.s + bytes[0]) & 0xffff;
      var location_low_byte = cpu.mmu.read_byte(location);
      var location_high_byte = cpu.mmu.read_byte(location+1); 
      var absolute_location = (location_high_byte<<8)|location_low_byte;
      absolute_location += cpu.r.y;
      if(cpu.p.m) {
        var b;
        if(absolute_location>=0x10000) {
          b = cpu.mmu.read_byte_long(absolute_location & 0xffff, cpu.r.dbr+1);  
        } else {
          b = cpu.mmu.read_byte(absolute_location);
        }
        ORA_const.execute(cpu, [b]);
      } else {
        var low_byte;
        var high_byte;
        if(absolute_location>=0x10000) {
          absolute_location &= 0xffff;
          low_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
          high_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
        } else {
          low_byte = cpu.mmu.read_byte(absolute_location);
          if(absolute_location===0xffff) {
            high_byte = cpu.mmu.read_byte_long(0, cpu.r.dbr+1);
          } else {
            high_byte = cpu.mmu.read_byte(absolute_location);
          }
        }
        ORA_const.execute(cpu, [low_byte, high_byte]); 
      } 
    }
  }
};

var AND_const = {
  bytes_required:function(cpu) {
    if(cpu.p.e|cpu.p.m) {
      return 2;
    } else {
      return 3; 
    }
  },
  execute:function(cpu, bytes) {
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
      AND_const.execute(cpu, [cpu.mmu.read_byte(location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      AND_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var AND_absolute_long = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.e|cpu.p.m) {
      AND_const.execute(cpu, [cpu.mmu.read_byte_long(location, bytes[2])]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(location, bytes[2]);
      var high_byte = cpu.mmu.read_byte_long(location+1, bytes[2]);
      AND_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var AND_absolute_long_indexed_x = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0]) + cpu.r.x;
    if(location & 0x10000) {
      bytes[2]++;
      location &= 0xffff;      
    }

    if(cpu.p.e|cpu.p.m) {
      AND_const.execute(cpu, [cpu.mmu.read_byte_long(location, bytes[2])]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(location, bytes[2]);
      location++;
      if(location & 0x10000) {
        bytes[2]++;
        location &= 0xffff;      
      }
      var high_byte = cpu.mmu.read_byte_long(location, bytes[2]);
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
      AND_const.execute(cpu, [cpu.mmu.read_byte(absolute_location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(absolute_location);
      var high_byte = cpu.mmu.read_byte(absolute_location+1);
      AND_const.execute(cpu, [low_byte, high_byte]);
    }
  } 
};

var AND_direct_page_indirect_long = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var low_byte_loc = cpu.mmu.read_byte(location&0xffff);
    var high_byte_loc = cpu.mmu.read_byte((location+1)&0xffff);
    var bank_byte = cpu.mmu.read_byte((location+2)&0xffff);
    var absolute_location = (high_byte_loc<<8) | low_byte_loc;
    if(cpu.p.e|cpu.p.m) {
      AND_const.execute(cpu, [cpu.mmu.read_byte_long(absolute_location, bank_byte)]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte);
      var high_byte = cpu.mmu.read_byte_long((absolute_location+1)&0xffff, bank_byte);
      AND_const.execute(cpu, [low_byte, high_byte]);
    }
  } 
};

var AND_direct_page_indirect_long_indexed_y = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var low_byte_loc = cpu.mmu.read_byte(location&0xffff);
    var high_byte_loc = cpu.mmu.read_byte((location+1)&0xffff);
    var bank_byte = cpu.mmu.read_byte((location+2)&0xffff);
    var absolute_location = ((high_byte_loc<<8) | low_byte_loc) + cpu.r.y;
    if(absolute_location >> 16) {
      absolute_location &= 0xffff;
      bank_byte++;
    }
    if(cpu.p.e|cpu.p.m) {
      AND_const.execute(cpu, [cpu.mmu.read_byte_long(absolute_location, bank_byte)]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte);
      absolute_location++;
      if(absolute_location >> 16) {
        absolute_location &= 0xffff;
        bank_byte++;
      }
      var high_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte);
      AND_const.execute(cpu, [low_byte, high_byte]);
    }
  } 
};

var AND_direct_page_indirect_indexed_y = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var low_byte_loc = cpu.mmu.read_byte(location);
    var high_byte_loc = cpu.mmu.read_byte(location+1);
    var absolute_location = ((high_byte_loc<<8) | low_byte_loc) + cpu.r.y;
    if(cpu.p.e|cpu.p.m) {
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

var AND_stack_relative = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if(cpu.p.e) {
      var location = 0x100 | ((cpu.r.s + bytes[0]) & 0xff);
      AND_const.execute(cpu, [cpu.mmu.read_byte(location)]);
    } else {
      if(cpu.p.m) {
        AND_const.execute(cpu, [cpu.mmu.read_byte(cpu.r.s+bytes[0])]);
      } else {
        var location = cpu.r.s + bytes[0];
        var low_byte = cpu.mmu.read_byte(location);
        var high_byte = cpu.mmu.read_byte(location+1);
        AND_const.execute(cpu, [low_byte, high_byte]); 
      } 
    }
  }
};

var AND_stack_relative_indirect_indexed_y = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if(cpu.p.e) {
      var location_loc = 0x100 | ((cpu.r.s + bytes[0]) & 0xff);
      var low_byte =  cpu.mmu.read_byte(location_loc);
      var high_byte;
      if(location_loc===0x1ff) {
        high_byte = cpu.mmu.read_byte(0x100);
      } else {
        high_byte = cpu.mmu.read_byte(location_loc+1);
      }
      var absolute_location = ((high_byte<<8)|low_byte)+cpu.r.y;
      var b;
      if(absolute_location>=0x10000) {
        b = cpu.mmu.read_byte_long(absolute_location & 0xffff, cpu.r.dbr+1);
      } else {
        b = cpu.mmu.read_byte(absolute_location);
      }
      AND_const.execute(cpu, [b]);
    } else {
      var location_loc = (cpu.r.s + bytes[0]) & 0xffff;
      var location_low_byte = cpu.mmu.read_byte(location);
      var location_high_byte = cpu.mmu.read_byte(location+1); 
      var absolute_location = (location_high_byte<<8)|location_low_byte;
      absolute_location += cpu.r.y;
      if(cpu.p.m) {
        var b;
        if(absolute_location>=0x10000) {
          b = cpu.mmu.read_byte_long(absolute_location & 0xffff, cpu.r.dbr+1);  
        } else {
          b = cpu.mmu.read_byte(absolute_location);
        }
        AND_const.execute(cpu, [b]);
      } else {
        var low_byte;
        var high_byte;
        if(absolute_location>=0x10000) {
          absolute_location &= 0xffff;
          low_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
          high_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
        } else {
          low_byte = cpu.mmu.read_byte(absolute_location);
          if(absolute_location===0xffff) {
            high_byte = cpu.mmu.read_byte_long(0, cpu.r.dbr+1);
          } else {
            high_byte = cpu.mmu.read_byte(absolute_location);
          }
        }
        AND_const.execute(cpu, [low_byte, high_byte]); 
      } 
    }
  }
};

var CPX_const = {
  bytes_required:function(cpu) {
    if(cpu.p.e|cpu.p.x) {
      return 2; 
    } else {
      return 3; 
    }
  },
  execute:function(cpu, bytes) {
    var result;
    if(cpu.p.e|cpu.p.x) {
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.x) {
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
    if(cpu.p.e|cpu.p.x) {
      return 2; 
    } else {
      return 3; 
    }
  },
  execute:function(cpu, bytes) {
    var result;
    if(cpu.p.e|cpu.p.x) {
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.x) {
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
    if(cpu.p.e|cpu.p.m) {
      return 2; 
    } else {
      return 3; 
    }
  },
  execute:function(cpu, bytes) {
    var result;
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
      CMP_const.execute(cpu, cpu.mmu.read_byte(location));
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      CMP_const.execute(cpu, [low_byte, high_byte]);
    } 
  }
};

var CMP_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    CMP_direct_page.execute(cpu, [bytes[0]+cpu.r.x]);  
  }
};

var CMP_direct_page_indirect = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var low_byte_loc = cpu.mmu.read_byte(location);
    var high_byte_loc = cpu.mmu.read_byte(location+1);
    var absolute_location = (high_byte_loc<<8) | low_byte_loc;
    if(cpu.p.e|cpu.p.m) {
      CMP_const.execute(cpu, [cpu.mmu.read_byte(absolute_location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(absolute_location);
      var high_byte = cpu.mmu.read_byte(absolute_location+1);
      CMP_const.execute(cpu, [low_byte, high_byte]);
    }
  } 
};

var CMP_direct_page_indirect_long = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var low_byte_loc = cpu.mmu.read_byte(location&0xffff);
    var high_byte_loc = cpu.mmu.read_byte((location+1)&0xffff);
    var bank_byte = cpu.mmu.read_byte((location+2)&0xffff);
    var absolute_location = (high_byte_loc<<8) | low_byte_loc;
    if(cpu.p.e|cpu.p.m) {
      CMP_const.execute(cpu, [cpu.mmu.read_byte_long(absolute_location, bank_byte)]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte);
      var high_byte = cpu.mmu.read_byte_long((absolute_location+1)&0xffff, bank_byte);
      CMP_const.execute(cpu, [low_byte, high_byte]);
    }
  } 
};

var CMP_direct_page_indirect_long_indexed_y = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var low_byte_loc = cpu.mmu.read_byte(location&0xffff);
    var high_byte_loc = cpu.mmu.read_byte((location+1)&0xffff);
    var bank_byte = cpu.mmu.read_byte((location+2)&0xffff);
    var absolute_location = ((high_byte_loc<<8) | low_byte_loc) + cpu.r.y;
    if(absolute_location >> 16) {
      absolute_location &= 0xffff;
      bank_byte++;
    }
    if(cpu.p.e|cpu.p.m) {
      CMP_const.execute(cpu, [cpu.mmu.read_byte_long(absolute_location, bank_byte)]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte);
      absolute_location++;
      if(absolute_location >> 16) {
        absolute_location &= 0xffff;
        bank_byte++;
      }
      var high_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte);
      CMP_const.execute(cpu, [low_byte, high_byte]);
    }
  } 
};

var CMP_direct_page_indirect_indexed_y = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var low_byte_loc = cpu.mmu.read_byte(location);
    var high_byte_loc = cpu.mmu.read_byte(location+1);
    var absolute_location = ((high_byte_loc<<8) | low_byte_loc) + cpu.r.y;
    if(cpu.p.e|cpu.p.m) {
      CMP_const.execute(cpu, [cpu.mmu.read_byte(absolute_location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(absolute_location);
      var high_byte = cpu.mmu.read_byte(absolute_location+1);
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
    if(cpu.p.e|cpu.p.m) {
      CMP_const.execute(cpu, [cpu.mmu.read_byte(location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      CMP_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var CMP_absolute_long = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.e|cpu.p.m) {
      CMP_const.execute(cpu, [cpu.mmu.read_byte_long(location, bytes[2])]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(location, bytes[2]);
      var high_byte = cpu.mmu.read_byte_long(location+1, bytes[2]);
      CMP_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var CMP_absolute_long_indexed_x = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0]) + cpu.r.x;
    if(location & 0x10000) {
      bytes[2]++;
      location &= 0xffff;      
    }

    if(cpu.p.e|cpu.p.m) {
      CMP_const.execute(cpu, [cpu.mmu.read_byte_long(location, bytes[2])]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(location, bytes[2]);
      location++;
      if(location & 0x10000) {
        bytes[2]++;
        location &= 0xffff;      
      }
      var high_byte = cpu.mmu.read_byte_long(location, bytes[2]);
      CMP_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var CMP_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0])+cpu.r.x;
    var location_high_byte = location >> 8;
    var location_low_byte = location & 0x00ff;
    CMP_absolute.execute(cpu, [location_low_byte, location_high_byte]);  
  }
};

var CMP_absolute_indexed_y = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0])+cpu.r.y;
    var location_high_byte = location >> 8;
    var location_low_byte = location & 0x00ff;
    CMP_absolute.execute(cpu, [location_low_byte, location_high_byte]);  
  }
};

var CMP_stack_relative = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if(cpu.p.e) {
      var location = 0x100 | ((cpu.r.s + bytes[0]) & 0xff);
      CMP_const.execute(cpu, [cpu.mmu.read_byte(location)]);
    } else {
      if(cpu.p.m) {
        CMP_const.execute(cpu, [cpu.mmu.read_byte(cpu.r.s+bytes[0])]);
      } else {
        var location = cpu.r.s + bytes[0];
        var low_byte = cpu.mmu.read_byte(location);
        var high_byte = cpu.mmu.read_byte(location+1);
        CMP_const.execute(cpu, [low_byte, high_byte]); 
      } 
    }
  }
};

var CMP_stack_relative_indirect_indexed_y = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if(cpu.p.e) {
      var location_loc = 0x100 | ((cpu.r.s + bytes[0]) & 0xff);
      var low_byte =  cpu.mmu.read_byte(location_loc);
      var high_byte;
      if(location_loc===0x1ff) {
        high_byte = cpu.mmu.read_byte(0x100);
      } else {
        high_byte = cpu.mmu.read_byte(location_loc+1);
      }
      var absolute_location = ((high_byte<<8)|low_byte)+cpu.r.y;
      var b;
      if(absolute_location>=0x10000) {
        b = cpu.mmu.read_byte_long(absolute_location & 0xffff, cpu.r.dbr+1);
      } else {
        b = cpu.mmu.read_byte(absolute_location);
      }
      CMP_const.execute(cpu, [b]);
    } else {
      var location_loc = (cpu.r.s + bytes[0]) & 0xffff;
      var location_low_byte = cpu.mmu.read_byte(location);
      var location_high_byte = cpu.mmu.read_byte(location+1); 
      var absolute_location = (location_high_byte<<8)|location_low_byte;
      absolute_location += cpu.r.y;
      if(cpu.p.m) {
        var b;
        if(absolute_location>=0x10000) {
          b = cpu.mmu.read_byte_long(absolute_location & 0xffff, cpu.r.dbr+1);  
        } else {
          b = cpu.mmu.read_byte(absolute_location);
        }
        CMP_const.execute(cpu, [b]);
      } else {
        var low_byte;
        var high_byte;
        if(absolute_location>=0x10000) {
          absolute_location &= 0xffff;
          low_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
          high_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
        } else {
          low_byte = cpu.mmu.read_byte(absolute_location);
          if(absolute_location===0xffff) {
            high_byte = cpu.mmu.read_byte_long(0, cpu.r.dbr+1);
          } else {
            high_byte = cpu.mmu.read_byte(absolute_location);
          }
        }
        CMP_const.execute(cpu, [low_byte, high_byte]); 
      } 
    }
  }
};

var SBC_const = {
  bytes_required:function(cpu) {
    if(cpu.p.e|cpu.p.m) {
      return 2;
    } else {
      return 3;
    }  
  },
  execute:function(cpu, bytes) {
    var old_a = cpu.r.a;
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
      SBC_const.execute(cpu, [cpu.mmu.read_byte(location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      SBC_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var SBC_absolute_long = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.e|cpu.p.m) {
      SBC_const.execute(cpu, [cpu.mmu.read_byte_long(location, bytes[2])]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(location, bytes[2]);
      var high_byte = cpu.mmu.read_byte_long(location+1, bytes[2]);
      SBC_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var SBC_absolute_long_indexed_x = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0]) + cpu.r.x;
    if(location & 0x10000) {
      bytes[2]++;
      location &= 0xffff;      
    }

    if(cpu.p.e|cpu.p.m) {
      SBC_const.execute(cpu, [cpu.mmu.read_byte_long(location, bytes[2])]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(location, bytes[2]);
      location++;
      if(location & 0x10000) {
        bytes[2]++;
        location &= 0xffff;      
      }
      var high_byte = cpu.mmu.read_byte_long(location, bytes[2]);
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
    if(cpu.p.e|cpu.p.m) {
      SBC_const.execute(cpu, [cpu.mmu.read_byte(absolute_location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(absolute_location);
      var high_byte = cpu.mmu.read_byte(absolute_location+1);
      SBC_const.execute(cpu, [low_byte, high_byte]);
    }
  } 
};

var SBC_direct_page_indirect_long = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var low_byte_loc = cpu.mmu.read_byte(location&0xffff);
    var high_byte_loc = cpu.mmu.read_byte((location+1)&0xffff);
    var bank_byte = cpu.mmu.read_byte((location+2)&0xffff);
    var absolute_location = (high_byte_loc<<8) | low_byte_loc;
    if(cpu.p.e|cpu.p.m) {
      SBC_const.execute(cpu, [cpu.mmu.read_byte_long(absolute_location, bank_byte)]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte);
      var high_byte = cpu.mmu.read_byte_long((absolute_location+1)&0xffff, bank_byte);
      SBC_const.execute(cpu, [low_byte, high_byte]);
    }
  } 
};

var SBC_direct_page_indirect_long_indexed_y = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var low_byte_loc = cpu.mmu.read_byte(location&0xffff);
    var high_byte_loc = cpu.mmu.read_byte((location+1)&0xffff);
    var bank_byte = cpu.mmu.read_byte((location+2)&0xffff);
    var absolute_location = ((high_byte_loc<<8) | low_byte_loc) + cpu.r.y;
    if(absolute_location >> 16) {
      absolute_location &= 0xffff;
      bank_byte++;
    }
    if(cpu.p.e|cpu.p.m) {
      SBC_const.execute(cpu, [cpu.mmu.read_byte_long(absolute_location, bank_byte)]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte);
      absolute_location++;
      if(absolute_location >> 16) {
        absolute_location &= 0xffff;
        bank_byte++;
      }
      var high_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte);
      SBC_const.execute(cpu, [low_byte, high_byte]);
    }
  } 
};

var SBC_direct_page_indirect_indexed_y = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var low_byte_loc = cpu.mmu.read_byte(location);
    var high_byte_loc = cpu.mmu.read_byte(location+1);
    var absolute_location = ((high_byte_loc<<8) | low_byte_loc) + cpu.r.y;
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
      SBC_const.execute(cpu, [cpu.mmu.read_byte(absolute_location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(absolute_location);
      var high_byte = cpu.mmu.read_byte(absolute_location+1);
      SBC_const.execute(cpu, [low_byte, high_byte]);
    }
  } 
};

var SBC_stack_relative = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if(cpu.p.e) {
      var location = 0x100 | ((cpu.r.s + bytes[0]) & 0xff);
      SBC_const.execute(cpu, [cpu.mmu.read_byte(location)]);
    } else {
      if(cpu.p.m) {
        SBC_const.execute(cpu, [cpu.mmu.read_byte(cpu.r.s+bytes[0])]);
      } else {
        var location = cpu.r.s + bytes[0];
        var low_byte = cpu.mmu.read_byte(location);
        var high_byte = cpu.mmu.read_byte(location+1);
        SBC_const.execute(cpu, [low_byte, high_byte]); 
      } 
    }
  }
};

var SBC_stack_relative_indirect_indexed_y = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if(cpu.p.e) {
      var location_loc = 0x100 | ((cpu.r.s + bytes[0]) & 0xff);
      var low_byte =  cpu.mmu.read_byte(location_loc);
      var high_byte;
      if(location_loc===0x1ff) {
        high_byte = cpu.mmu.read_byte(0x100);
      } else {
        high_byte = cpu.mmu.read_byte(location_loc+1);
      }
      var absolute_location = ((high_byte<<8)|low_byte)+cpu.r.y;
      var b;
      if(absolute_location>=0x10000) {
        b = cpu.mmu.read_byte_long(absolute_location & 0xffff, cpu.r.dbr+1);
      } else {
        b = cpu.mmu.read_byte(absolute_location);
      }
      SBC_const.execute(cpu, [b]);
    } else {
      var location_loc = (cpu.r.s + bytes[0]) & 0xffff;
      var location_low_byte = cpu.mmu.read_byte(location);
      var location_high_byte = cpu.mmu.read_byte(location+1); 
      var absolute_location = (location_high_byte<<8)|location_low_byte;
      absolute_location += cpu.r.y;
      if(cpu.p.m) {
        var b;
        if(absolute_location>=0x10000) {
          b = cpu.mmu.read_byte_long(absolute_location & 0xffff, cpu.r.dbr+1);  
        } else {
          b = cpu.mmu.read_byte(absolute_location);
        }
        SBC_const.execute(cpu, [b]);
      } else {
        var low_byte;
        var high_byte;
        if(absolute_location>=0x10000) {
          absolute_location &= 0xffff;
          low_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
          high_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
        } else {
          low_byte = cpu.mmu.read_byte(absolute_location);
          if(absolute_location===0xffff) {
            high_byte = cpu.mmu.read_byte_long(0, cpu.r.dbr+1);
          } else {
            high_byte = cpu.mmu.read_byte(absolute_location);
          }
        }
        SBC_const.execute(cpu, [low_byte, high_byte]); 
      } 
    }
  }
};

var ADC_const = {
  bytes_required:function(cpu) {
    if(cpu.p.e|cpu.p.m) {
      return 2;
    } else {
      return 3;
    }
  },
  execute:function(cpu, bytes) {
    var old_a = cpu.r.a; 
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
      ADC_const.execute(cpu, [cpu.mmu.read_byte(location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(location);
      var high_byte = cpu.mmu.read_byte(location+1);
      ADC_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var ADC_absolute_long = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.e|cpu.p.m) {
      ADC_const.execute(cpu, [cpu.mmu.read_byte_long(location, bytes[2])]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(location, bytes[2]);
      var high_byte = cpu.mmu.read_byte_long(location+1, bytes[2]);
      ADC_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var ADC_absolute_long_indexed_x = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0]) + cpu.r.x;
    if(location & 0x10000) {
      bytes[2]++;
      location &= 0xffff;      
    }

    if(cpu.p.e|cpu.p.m) {
      ADC_const.execute(cpu, [cpu.mmu.read_byte_long(location, bytes[2])]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(location, bytes[2]);
      location++;
      if(location & 0x10000) {
        bytes[2]++;
        location &= 0xffff;      
      }
      var high_byte = cpu.mmu.read_byte_long(location, bytes[2]);
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
      ADC_const.execute(cpu, [cpu.mmu.read_byte(absolute_location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(absolute_location);
      var high_byte = cpu.mmu.read_byte(absolute_location+1);
      ADC_const.execute(cpu, [low_byte, high_byte]);
    }
  } 
};

var ADC_direct_page_indirect_long_indexed_y = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var low_byte_loc = cpu.mmu.read_byte(location&0xffff);
    var high_byte_loc = cpu.mmu.read_byte((location+1)&0xffff);
    var bank_byte = cpu.mmu.read_byte((location+2)&0xffff);
    var absolute_location = ((high_byte_loc<<8) | low_byte_loc) + cpu.r.y;
    if(absolute_location >> 16) {
      absolute_location &= 0xffff;
      bank_byte++;
    }
    if(cpu.p.e|cpu.p.m) {
      ADC_const.execute(cpu, [cpu.mmu.read_byte_long(absolute_location, bank_byte)]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte);
      absolute_location++;
      if(absolute_location >> 16) {
        absolute_location &= 0xffff;
        bank_byte++;
      }
      var high_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte);
      ADC_const.execute(cpu, [low_byte, high_byte]);
    }
  } 
};

var ADC_direct_page_indirect_long = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var low_byte_loc = cpu.mmu.read_byte(location&0xffff);
    var high_byte_loc = cpu.mmu.read_byte((location+1)&0xffff);
    var bank_byte = cpu.mmu.read_byte((location+2)&0xffff);
    var absolute_location = (high_byte_loc<<8) | low_byte_loc;
    if(cpu.p.e|cpu.p.m) {
      ADC_const.execute(cpu, [cpu.mmu.read_byte_long(absolute_location, bank_byte)]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte);
      var high_byte = cpu.mmu.read_byte_long((absolute_location+1)&0xffff, bank_byte);
      ADC_const.execute(cpu, [low_byte, high_byte]);
    }
  } 
};

var ADC_direct_page_indirect_indexed_y = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    var low_byte_loc = cpu.mmu.read_byte(location);
    var high_byte_loc = cpu.mmu.read_byte(location+1);
    var absolute_location = ((high_byte_loc<<8) | low_byte_loc) + cpu.r.y;
    if(cpu.p.e|cpu.p.m) {
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

var ADC_stack_relative = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if(cpu.p.e) {
      var location = 0x100 | ((cpu.r.s + bytes[0]) & 0xff);
      ADC_const.execute(cpu, [cpu.mmu.read_byte(location)]);
    } else {
      if(cpu.p.m) {
        ADC_const.execute(cpu, [cpu.mmu.read_byte(cpu.r.s+bytes[0])]);
      } else {
        var location = cpu.r.s + bytes[0];
        var low_byte = cpu.mmu.read_byte(location);
        var high_byte = cpu.mmu.read_byte(location+1);
        ADC_const.execute(cpu, [low_byte, high_byte]); 
      } 
    }
  }
};

var ADC_stack_relative_indirect_indexed_y = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if(cpu.p.e) {
      var location_loc = 0x100 | ((cpu.r.s + bytes[0]) & 0xff);
      var low_byte =  cpu.mmu.read_byte(location_loc);
      var high_byte;
      if(location_loc===0x1ff) {
        high_byte = cpu.mmu.read_byte(0x100);
      } else {
        high_byte = cpu.mmu.read_byte(location_loc+1);
      }
      var absolute_location = ((high_byte<<8)|low_byte)+cpu.r.y;
      var b;
      if(absolute_location>=0x10000) {
        b = cpu.mmu.read_byte_long(absolute_location & 0xffff, cpu.r.dbr+1);
      } else {
        b = cpu.mmu.read_byte(absolute_location);
      }
      ADC_const.execute(cpu, [b]);
    } else {
      var location_loc = (cpu.r.s + bytes[0]) & 0xffff;
      var location_low_byte = cpu.mmu.read_byte(location);
      var location_high_byte = cpu.mmu.read_byte(location+1); 
      var absolute_location = (location_high_byte<<8)|location_low_byte;
      absolute_location += cpu.r.y;
      if(cpu.p.m) {
        var b;
        if(absolute_location>=0x10000) {
          b = cpu.mmu.read_byte_long(absolute_location & 0xffff, cpu.r.dbr+1);  
        } else {
          b = cpu.mmu.read_byte(absolute_location);
        }
        ADC_const.execute(cpu, [b]);
      } else {
        var low_byte;
        var high_byte;
        if(absolute_location>=0x10000) {
          absolute_location &= 0xffff;
          low_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
          high_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
        } else {
          low_byte = cpu.mmu.read_byte(absolute_location);
          if(absolute_location===0xffff) {
            high_byte = cpu.mmu.read_byte_long(0, cpu.r.dbr+1);
          } else {
            high_byte = cpu.mmu.read_byte(absolute_location);
          }
        }
        ADC_const.execute(cpu, [low_byte, high_byte]); 
      } 
    }
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

var BRL = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    // Handle double byte two's complement numbers as the branch argument.
    var num = (bytes[1]<<8)|bytes[0];
    if(num<=32767) {
      cpu.r.pc+=num;
    } else {
      cpu.r.pc-=65536-num;
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
    if(cpu.p.e|cpu.p.m) {
      if(cpu.p.e|cpu.p.x) {
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
    if(cpu.p.e|cpu.p.m) {
      if(cpu.p.e|cpu.p.x) {
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
    if(cpu.p.e|cpu.p.m) {
      if(cpu.p.e|cpu.p.x) {
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
    if(cpu.p.e|cpu.p.m) {
      if(cpu.p.e|cpu.p.x) {
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

    if(cpu.p.e|cpu.p.x) {
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
    
    if(cpu.p.e|cpu.p.x) {
      cpu.p.n = cpu.r.y >> 7;
    } else {
      cpu.p.n = cpu.r.y >> 15;
    }
  }
};

var TCD = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    // Transfers 16-bits regardless of setting.
    if(cpu.p.e|cpu.p.m) {
      cpu.r.d = (cpu.r.b<<8)|cpu.r.a; 
    } else {
      cpu.r.d = cpu.r.a;
    }

    cpu.p.n = cpu.r.d >> 15;
    
    if(cpu.r.d===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var TDC = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    // Transfers 16-bits regardless of setting.
    if(cpu.p.e|cpu.p.m) {
      cpu.r.a = cpu.r.d & 0xff;
      cpu.r.b = cpu.r.d >> 8;
      cpu.p.n = cpu.r.b >> 7;
    } else {
      cpu.r.a = cpu.r.d;
      cpu.p.n = cpu.r.a >> 7; 
    }
    
    if(cpu.r.a===0) {
      cpu.p.z = 1;
    } else {
      cpu.p.z = 0;
    }
  }
};

var TCS = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    if(cpu.p.e|!cpu.p.m) {
      cpu.r.s = cpu.r.a;
    } else {
      cpu.r.s = (cpu.r.b<<8)|cpu.r.a;
    }
  }
};

var TSC = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    if(cpu.p.e) {
      cpu.r.b = 1;
      cpu.r.a = cpu.r.s;
      // TODO: Figure out if in emulation mode the z and n bits should always
      // be set to zero here as a 1 is transferred to b.
      cpu.p.n = 0;
      cpu.p.z = 0;
    } else {
      if(cpu.p.m) {
        cpu.r.a = cpu.r.s & 0xff;
        cpu.r.b = cpu.r.s >> 8;
        cpu.p.n = cpu.r.b >> 7;
      } else {
        cpu.r.a = cpu.r.s; 
        cpu.p.n = cpu.r.a >> 15;
      }

      if(cpu.r.s===0) {
        cpu.p.z = 1;
      } else {
        cpu.p.z = 0;
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
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

var STA_direct_page_indirect_long = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    if(cpu.p.e|cpu.p.m) {
      var low_byte_loc = cpu.mmu.read_byte(location&0xffff);
      var high_byte_loc = cpu.mmu.read_byte((location+1)&0xffff);
      var bank_byte = cpu.mmu.read_byte((location+2)&0xffff);
      cpu.mmu.store_byte_long((high_byte_loc<<8) | low_byte_loc, bank_byte, cpu.r.a); 
    } else {
      var low_byte_loc = cpu.mmu.read_byte(location&0xffff);
      var high_byte_loc = cpu.mmu.read_byte((location+1)&0xffff);
      var bank_byte = cpu.mmu.read_byte((location+2)&0xffff);
      var absolute_location = (high_byte_loc<<8) | low_byte_loc;
      var low_byte = cpu.r.a & 0x00ff;
      var high_byte = cpu.r.a >> 8;
      cpu.mmu.store_byte(absolute_location, bank_byte, low_byte);
      cpu.mmu.store_byte((absolute_location+1)&0xffff, bank_byte, high_byte);
    }
  }
};

var STA_direct_page_indirect_long_indexed_y = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    if(cpu.p.e|cpu.p.m) {
      var low_byte_loc = cpu.mmu.read_byte(location&0xffff);
      var high_byte_loc = cpu.mmu.read_byte((location+1)&0xffff);
      var bank_byte = cpu.mmu.read_byte((location+2)&0xffff);
      var absolute_location = ((high_byte_loc << 8) | low_byte_loc) + cpu.r.y;
      if(absolute_location >> 16) {
        bank_byte++;
        absolute_location &= 0xffff;
      }
      cpu.mmu.store_byte_long(absolute_location, bank_byte, cpu.r.a); 
    } else {
      var low_byte_loc = cpu.mmu.read_byte(location&0xffff);
      var high_byte_loc = cpu.mmu.read_byte((location+1)&0xffff);
      var bank_byte = cpu.mmu.read_byte((location+2)&0xffff);
      var absolute_location = ((high_byte_loc<<8) | low_byte_loc) + cpu.r.y;
      if(absolute_location >> 16) {
        bank_byte++;
        absolute_location &= 0xffff;
      }
      var low_byte = cpu.r.a & 0x00ff;
      var high_byte = cpu.r.a >> 8;
      cpu.mmu.store_byte(absolute_location, bank_byte, low_byte);
      absolute_location++;
      if(absolute_location >> 16) {
        bank_byte++;
        absolute_location &= 0xffff;
      }
      cpu.mmu.store_byte(absolute_location, bank_byte, high_byte);
    }
  }
};

var STA_direct_page_indirect_indexed_y = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    if(cpu.p.e|cpu.p.m) {
      var low_byte_loc = cpu.mmu.read_byte(location);
      var high_byte_loc = cpu.mmu.read_byte(location+1);
      cpu.mmu.store_byte((high_byte_loc<<8) | low_byte_loc, cpu.r.a); 
    } else {
      var low_byte_loc = cpu.mmu.read_byte(location);
      var high_byte_loc = cpu.mmu.read_byte(location+1);
      var absolute_location = ((high_byte_loc<<8) | low_byte_loc) + cpu.r.y;
      var low_byte = cpu.r.a & 0x00ff;
      var high_byte = cpu.r.a >> 8;
      cpu.mmu.store_byte(absolute_location, low_byte);
      cpu.mmu.store_byte(absolute_location+1, high_byte);
    }
  }
};

var STA_stack_relative = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if(cpu.p.e) {
      var location = 0x100 | ((cpu.r.s + bytes[0]) & 0xff);
      cpu.mmu.store_byte(location, cpu.r.a);
    } else {
      if(cpu.p.m) {
        cpu.mmu.store_byte(cpu.r.s + bytes[0], cpu.r.a);
      } else {
        var low_byte = cpu.r.a & 0xff;
        var high_byte = cpu.r.a >> 8;
        var location = cpu.r.s + bytes[0];
        cpu.mmu.store_byte(location, low_byte);
        cpu.mmu.store_byte(location+1, high_byte); 
      }
    }
  }
};

var STA_stack_relative_indirect_indexed_y = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if(cpu.p.e) {
      var location_loc = 0x100 | ((cpu.r.s + bytes[0]) & 0xff);
      var low_byte =  cpu.mmu.read_byte(location_loc);
      var high_byte;
      if(location_loc===0x1ff) {
        high_byte = cpu.mmu.read_byte(0x100);
      } else {
        high_byte = cpu.mmu.read_byte(location_loc+1);
      }
      var absolute_location = ((high_byte<<8)|low_byte)+cpu.r.y;
      var b;
      if(absolute_location>=0x10000) {
        b = cpu.mmu.read_byte_long(absolute_location & 0xffff, cpu.r.dbr+1);
      } else {
        b = cpu.mmu.read_byte(absolute_location);
      }
      cpu.mmu.store_byte(b, cpu.r.a);
    } else {
      var location_loc = (cpu.r.s + bytes[0]) & 0xffff;
      var location_low_byte = cpu.mmu.read_byte(location);
      var location_high_byte = cpu.mmu.read_byte(location+1); 
      var absolute_location = (location_high_byte<<8)|location_low_byte;
      absolute_location += cpu.r.y;
      if(cpu.p.m) {
        var b;
        if(absolute_location>=0x10000) {
          b = cpu.mmu.read_byte_long(absolute_location & 0xffff, cpu.r.dbr+1);  
        } else {
          b = cpu.mmu.read_byte(absolute_location);
        }
        cpu.mmu.store_byte(b, cpu.r.a);
      } else {
        var low_byte;
        var high_byte;
        if(absolute_location>=0x10000) {
          absolute_location &= 0xffff;
          low_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
          high_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
        } else {
          low_byte = cpu.mmu.read_byte(absolute_location);
          if(absolute_location===0xffff) {
            high_byte = cpu.mmu.read_byte_long(0, cpu.r.dbr+1);
          } else {
            high_byte = cpu.mmu.read_byte(absolute_location);
          }
        }  
        var sta_location = (high_byte<<8)|low_byte;
        cpu.mmu.store_byte(sta_location, cpu.r.a & 0xff);
        cpu.mmu.store_byte(sta_location+1, cpu.r.a >> 8); 
      } 
    }
  }
};

var LDA_direct_page_indirect = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    if(cpu.p.e|cpu.p.m) {
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

var LDA_direct_page_indirect_long = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    if(cpu.p.e|cpu.p.m) {
      var low_byte_loc = cpu.mmu.read_byte(location&0xffff);
      var high_byte_loc = cpu.mmu.read_byte((location+1)&0xffff);
      var bank_byte = cpu.mmu.read_byte((location+2)&0xffff);
      cpu.r.a = cpu.mmu.read_byte_long((high_byte_loc<<8) | low_byte_loc, bank_byte); 
      cpu.p.n = cpu.r.a >> 7;
    } else {
      var low_byte_loc = cpu.mmu.read_byte(location&0xffff);
      var high_byte_loc = cpu.mmu.read_byte((location+1)&0xffff);
      var bank_byte = cpu.mmu.read_byte((location+2)&0xffff);
      var absolute_location = (high_byte_loc<<8) | low_byte_loc;
      var low_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte);
      var high_byte = cpu.mmu.read_byte_long((absolute_location+1)&0xffff, bank_byte);
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

var LDA_direct_page_indirect_long_indexed_y = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    if(cpu.p.e|cpu.p.m) {
      var low_byte_loc = cpu.mmu.read_byte(location&0xffff);
      var high_byte_loc = cpu.mmu.read_byte((location+1)&0xffff);
      var bank_byte = cpu.mmu.read_byte((location+2)&0xffff);
      var absolute_location = ((high_byte_loc << 8) | low_byte_loc) + cpu.r.y;
      if(absolute_location >> 16) {
        bank_byte++;
        absolute_location &= 0xffff; 
      }
      cpu.r.a = cpu.mmu.read_byte_long(absolute_location, bank_byte); 
      cpu.p.n = cpu.r.a >> 7;
    } else {
      var low_byte_loc = cpu.mmu.read_byte(location&0xffff);
      var high_byte_loc = cpu.mmu.read_byte((location+1)&0xffff);
      var bank_byte = cpu.mmu.read_byte((location+2)&0xffff);
      var absolute_location = ((high_byte_loc<<8) | low_byte_loc) + cpu.r.y;
      if(absolute_location >> 16) {
        bank_byte++;
        absolute_location &= 0xffff;
      }
      var low_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte);
      absolute_location++;
      if(absolute_location >> 16) {
        bank_byte++;
        absolute_location &= 0xffff;
      }
      var high_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte);
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

var LDA_direct_page_indirect_indexed_y = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    var location = bytes[0] + cpu.r.d;
    if(cpu.p.e|cpu.p.m) {
      var low_byte_loc = cpu.mmu.read_byte(location);
      var high_byte_loc = cpu.mmu.read_byte(location+1);
      var absolute_location = ((high_byte<<8) | low_byte) + cpu.r.y;
      cpu.r.a = cpu.mmu.read_byte(absolute_location); 
      cpu.p.n = cpu.r.a >> 7;
    } else {
      var low_byte_loc = cpu.mmu.read_byte(location);
      var high_byte_loc = cpu.mmu.read_byte(location+1);
      var absolute_location = ((high_byte_loc<<8) | low_byte_loc) + cpu.r.y;
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
    if(cpu.p.e|cpu.p.m) {
      cpu.r.a = cpu.mmu.read_byte(location);
      cpu.p.n = cpu.r.a >> 7;
    } else {
      var low_byte = cpu.mmu.read_byte(location&0xffff); 
      var high_byte = cpu.mmu.read_byte((location+1)&0xffff);
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
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

var LDA_stack_relative = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if(cpu.p.e) {
      var location = 0x100 | ((cpu.r.s + bytes[0]) & 0xff);
      LDA_const.execute(cpu, [cpu.mmu.read_byte(location)]);
    } else {
      if(cpu.p.m) {
        LDA_const.execute(cpu, [cpu.mmu.read_byte(cpu.r.s+bytes[0])]);
      } else {
        var location = cpu.r.s + bytes[0];
        var low_byte = cpu.mmu.read_byte(location);
        var high_byte = cpu.mmu.read_byte(location+1);
        LDA_const.execute(cpu, [low_byte, high_byte]); 
      } 
    }
  }
};

var LDA_stack_relative_indirect_indexed_y = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if(cpu.p.e) {
      var location_loc = 0x100 | ((cpu.r.s + bytes[0]) & 0xff);
      var low_byte =  cpu.mmu.read_byte(location_loc);
      var high_byte;
      if(location_loc===0x1ff) {
        high_byte = cpu.mmu.read_byte(0x100);
      } else {
        high_byte = cpu.mmu.read_byte(location_loc+1);
      }
      var absolute_location = ((high_byte<<8)|low_byte)+cpu.r.y;
      var b;
      if(absolute_location>=0x10000) {
        b = cpu.mmu.read_byte_long(absolute_location & 0xffff, cpu.r.dbr+1);
      } else {
        b = cpu.mmu.read_byte(absolute_location);
      }
      LDA_const.execute(cpu, [b]);
    } else {
      var location_loc = (cpu.r.s + bytes[0]) & 0xffff;
      var location_low_byte = cpu.mmu.read_byte(location);
      var location_high_byte = cpu.mmu.read_byte(location+1); 
      var absolute_location = (location_high_byte<<8)|location_low_byte;
      absolute_location += cpu.r.y;
      if(cpu.p.m) {
        var b;
        if(absolute_location>=0x10000) {
          b = cpu.mmu.read_byte_long(absolute_location & 0xffff, cpu.r.dbr+1);  
        } else {
          b = cpu.mmu.read_byte(absolute_location);
        }
        LDA_const.execute(cpu, [b]);
      } else {
        var low_byte;
        var high_byte;
        if(absolute_location>=0x10000) {
          absolute_location &= 0xffff;
          low_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
          high_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
        } else {
          low_byte = cpu.mmu.read_byte(absolute_location);
          if(absolute_location===0xffff) {
            high_byte = cpu.mmu.read_byte_long(0, cpu.r.dbr+1);
          } else {
            high_byte = cpu.mmu.read_byte(absolute_location);
          }
        }
        LDA_const.execute(cpu, [low_byte, high_byte]); 
      } 
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
    if(cpu.p.e|cpu.p.x)
      return 2;
    else
      return 3;
  },
  execute:function(cpu, bytes) {
    if(cpu.p.e|cpu.p.x) {
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
    if(cpu.p.e|cpu.p.x) {
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
    if(cpu.p.e|cpu.p.x) {
      cpu.r.y = cpu.mmu.read_byte(location);
      cpu.p.n = cpu.r.y >> 7;
    } else {
      var low_byte = cpu.mmu.read_byte(location&0xffff); 
      var high_byte = cpu.mmu.read_byte((location+1)&0xffff);
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
    if(cpu.p.e|cpu.p.x) {
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
    if(cpu.p.e|cpu.p.x) {
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
      if(cpu.p.e|cpu.p.x) {
        cpu.r.x = 0xff;
      } else {
        cpu.r.x = 0xffff;
      }
      cpu.p.n = 1;
      cpu.p.z = 0; 
    } else {
      cpu.r.x--;
      if(cpu.p.e|cpu.p.x) {
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
      if(cpu.p.e|cpu.p.x) {
        cpu.r.y = 0xff;
      } else {
        cpu.r.y = 0xffff; 
      }
      cpu.p.n = 1;
      cpu.p.z = 0;
    } else {
      cpu.r.y--;

      if(cpu.p.e|cpu.p.x) {
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
      if(cpu.p.e|cpu.p.x) {
        cpu.r.a = 0xff;
      } else {
        cpu.r.a = 0xffff;
      }
      cpu.p.n = 1;
      cpu.p.z = 0;
    } else {
      cpu.r.a--; 
      if(cpu.p.e|cpu.p.x) {
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
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
    
    if(cpu.p.e|cpu.p.x) {
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
    if(cpu.p.e|cpu.p.x) {
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
      cpu.mmu.store_byte(location, cpu.r.a);
    } else {
      var high_byte = cpu.r.a >> 8;
      var low_byte = cpu.r.a & 0x00ff;
      cpu.mmu.store_byte(location&0xffff, low_byte);
      cpu.mmu.store_byte((location+1)&0xffff, high_byte);
    }
  }
};

var STA_direct_page = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    var location = bytes[0]+cpu.p.d;
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.x) {
      cpu.mmu.store_byte(location, cpu.r.y);
    } else {
      var high_byte = cpu.r.y >> 8;
      var low_byte = cpu.r.y & 0x00ff;
      cpu.mmu.store_byte(location&0xffff, low_byte);
      cpu.mmu.store_byte((location+1)&0xffff, high_byte);
    }
  }
};

var STY_direct_page = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    var location = bytes[0]+cpu.p.d;
    if(cpu.p.e|cpu.p.x) {
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
    if(cpu.p.e|cpu.p.x) {
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
    if(cpu.p.e|cpu.p.x) {
      cpu.mmu.store_byte(location, cpu.r.x);
    } else {
      var high_byte = cpu.r.x >> 8;
      var low_byte = cpu.r.x & 0x00ff;
      cpu.mmu.store_byte(location&0xffff, low_byte);
      cpu.mmu.store_byte((location+1)&0xffff, high_byte);
    }
  }
};

var STX_direct_page = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    var location = bytes[0]+cpu.p.d;
    if(cpu.p.e|cpu.p.x) {
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
    if(cpu.p.e|cpu.p.x) {
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
    if(cpu.p.e|cpu.p.m) {
      cpu.mmu.store_byte_long(location, bytes[2], cpu.r.a);
    } else {
      var high_byte = cpu.r.a >> 8;
      var low_byte = cpu.r.a & 0x00ff;
      cpu.mmu.store_byte_long(location, bytes[2], low_byte);
      cpu.mmu.store_byte_long(location+1, bytes[2], high_byte); 
    }
  }
};

var STA_absolute_long_indexed_x = {
  bytes_required: function() {
    return 4;
  },
  execute: function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0]) + cpu.r.x;
    if(location & 0x10000) {
      location &= 0xffff;
      bytes[2]++;
    }
    if(cpu.p.e|cpu.p.m) {
      cpu.mmu.store_byte_long(location, bytes[2], cpu.r.a);
    } else {
      var high_byte = cpu.r.a >> 8;
      var low_byte = cpu.r.a & 0x00ff;
      cpu.mmu.store_byte_long(location, bytes[2], low_byte);
      location++;
      if(location & 0x10000) {
        location &= 0xffff;
        bytes[2]++;
      }
      cpu.mmu.store_byte_long(location, bytes[2], high_byte); 
    }
  }
};

var STA_absolute = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    var location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.x) {
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
    if(cpu.p.e|cpu.p.x) {
      cpu.r.x = cpu.mmu.read_byte(location);       
      cpu.p.n = cpu.r.x >> 7;
    } else {
      var low_byte = cpu.mmu.read_byte(location&0xffff); 
      var high_byte = cpu.mmu.read_byte((location+1)&0xffff);
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.x) {
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
    if(cpu.p.e|cpu.p.x) {
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
    if(cpu.p.e|cpu.p.m) {
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

var LDA_absolute_long_indexed_x = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    var location = ((bytes[1]<<8)|bytes[0]) + cpu.r.x;
    if(location & 0x10000) {
      bytes[2]++;
      location &= 0xffff;      
    }

    if(cpu.p.e|cpu.p.m) {
      cpu.r.a = cpu.mmu.read_byte_long(location, bytes[2]);
      cpu.p.n = cpu.r.a >> 7;
    } else {
      var low_byte = cpu.mmu.read_byte_long(location, bytes[2]); 
      location++;
      if(location & 0x10000) {
        bytes[2]++;
        location &= 0xffff;      
      }
      var high_byte = cpu.mmu.read_byte_long(location, bytes[2]);
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
    if(cpu.p.e|cpu.p.m) {
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
    if(cpu.p.e|cpu.p.m) {
      return 2;
    } else {
      return 3;
    }
  },
  execute: function(cpu, bytes) {
    if(cpu.p.e|cpu.p.m) {
      cpu.r.a = bytes[0];  
      cpu.p.n = cpu.r.a >> 7;
    } else {
      cpu.r.a = (bytes[1]<<8)|bytes[0];  
      cpu.p.n = cpu.r.a >> 15;
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
    if(cpu.p.e|cpu.p.x) { 
      return 2; 
    } else { 
      return 3;
    }
  },
  execute: function(cpu, bytes) {
    var constant;
    if(cpu.p.e|cpu.p.x) {
      cpu.r.x = bytes[0];  
      cpu.p.n = cpu.r.x >> 7;
    } else {
      cpu.r.x = (bytes[1]<<8)|bytes[0];  
      cpu.p.n = cpu.r.x >> 15;
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
      cpu.r.s &= 0xff;
    } else {
      // Switching to native mode. 
      cpu.r.a = (cpu.r.b<<8) | cpu.r.a;
      cpu.p.m = 1;
      cpu.p.x = 1;
      cpu.r.s |= 0x100;
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

var CLD = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.p.d = 0;
  }
};

var SED = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.p.d = 1;
  }
};

var CLV = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.p.v = 0;
  }
};

var XBA = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    if(cpu.p.e|cpu.p.m) {
      var old_a = cpu.r.a;
      cpu.r.a = cpu.r.b;
      cpu.r.b = old_a;

      cpu.p.n = cpu.r.a >> 7;
      if(cpu.r.a===0) {
        cpu.p.z = 1;
      } else {
        cpu.p.z = 0;
      }
    } else {
      var low_byte = cpu.r.a & 0xff;
      var high_byte = cpu.r.a >> 8;
      cpu.r.a = (low_byte<<8)|high_byte;
     
      cpu.p.n = high_byte >> 7; 
      if(high_byte===0) {
        cpu.p.z = 1;
      } else {
        cpu.p.z = 0;
      }
    }
  }
};
