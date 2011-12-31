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

(function(window) {
// A collection of helper functions.
var cpu_lib = {
  r: {
    p: {
      check_z: function(cpu, val) {
        if(val===0) {
          cpu.p.z = 1;
        } else {
          cpu.p.z = 0;
        }
      }
    }
  },
  addressing: {
    Direct_page: function(instruction) {
      this.bytes_required = function() {
        return 2;
      };

      this.execute = function(cpu, bytes) {
        cpu.cycle_count++;

        if((cpu.r.d&0xff)!==0)
          cpu.cycle_count++;

        var memory_location = bytes[0] + cpu.r.d;
        if(cpu.p.e||cpu.p.m) {
          instruction.execute(cpu, [cpu.mmu.read_byte(memory_location)]);
        } else {
          instruction.execute(cpu, [cpu.mmu.read_byte(memory_location),
                                    cpu.mmu.read_byte(memory_location+1)]);
        }
      };
    },
    Absolute: function(instruction) {
      this.bytes_required = function() {
        return 3;
      };

      this.execute = function(cpu, bytes) {
        cpu.cycle_count+=2;

        var memory_location = (bytes[1]<<8)|bytes[0];
        if(cpu.p.e||cpu.p.m) {
          instruction.execute(cpu, [cpu.mmu.read_byte(memory_location)]);
        } else {
          instruction.execute(cpu, [cpu.mmu.read_byte(memory_location),
                                    cpu.mmu.read_byte(memory_location+1)]);      
        }
      };
    }
  }
};

var STP = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=3;

    cpu.stopped = true;
  }
};

var WAI = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=3;

    cpu.waiting = true;
  }
};

var WDM = {
  bytes_required:function() {
    return 2;
  },
  execute:function() {}
};

var TXS = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=2;
    cpu.r.s = cpu.r.x;
    if(cpu.p.e||cpu.p.x) {
      cpu.p.n = cpu.r.s >> 7;
    } else {
      cpu.p.n = cpu.r.s >> 15;
    }
    cpu_lib.r.p.check_z(cpu, cpu.r.s);
  }
};

var TSX = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=2;
    if(cpu.p.e||cpu.p.x) {
      cpu.r.x = cpu.r.s & 0xff;
      cpu.p.n = cpu.r.x >> 7;
    } else {
      cpu.r.x = cpu.r.s;
      cpu.p.n = cpu.r.x >> 15;
    }
    cpu_lib.r.p.check_z(cpu, cpu.r.x);
  }
};

var TRB_absolute = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=6;

    var memory_location = (bytes[1]<<8)|bytes[0],
        data;
    if(cpu.p.e||cpu.p.m) {
      data = cpu.mmu.read_byte(memory_location);
      cpu_lib.r.p.check_z(cpu, data & cpu.r.a);
      cpu.mmu.store_byte(memory_location, (~cpu.r.a & data));
    } else {
      cpu.cycle_count+=2;

      data = cpu.mmu.read_word(memory_location);
      cpu_lib.r.p.check_z(cpu, data & cpu.r.a);
      data &= ~cpu.r.a;
      cpu.mmu.store_word(memory_location, data);
    }
  }
};

var TRB_direct_page = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=5;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        data;
    if(cpu.p.e||cpu.p.m) {
      data = cpu.mmu.read_byte(memory_location);
      cpu_lib.r.p.check_z(cpu, data & cpu.r.a);
      cpu.mmu.store_byte(memory_location, (~cpu.r.a & data));
    } else {
      cpu.cycle_count+=2;

      data = cpu.mmu.read_word(memory_location);
      cpu_lib.r.p.check_z(cpu, data & cpu.r.a);
      data &= ~cpu.r.a;
      cpu.mmu.store_word(memory_location, data);
    }
  }
};

var TSB_absolute = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=6;

    var memory_location = (bytes[1]<<8)|bytes[0],
        data;
    if(cpu.p.e||cpu.p.m) {
      data = cpu.mmu.read_byte(memory_location);
      cpu_lib.r.p.check_z(cpu, data & cpu.r.a);
      cpu.mmu.store_byte(memory_location, (cpu.r.a | data));
    } else {
      cpu.cycle_count+=2;

      data = cpu.mmu.read_word(memory_location);
      cpu_lib.r.p.check_z(cpu, data & cpu.r.a);
      data |= cpu.r.a;
      cpu.mmu.store_word(memory_location, data);
    }
  }
};

var TSB_direct_page = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=5;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        data;
    if(cpu.p.e||cpu.p.m) {
      data = cpu.mmu.read_byte(memory_location);
      cpu_lib.r.p.check_z(cpu, data & cpu.r.a);
      cpu.mmu.store_byte(memory_location, (cpu.r.a | data));
    } else {
      cpu.cycle_count+=2;

      data = cpu.mmu.read_word(memory_location);
      cpu_lib.r.p.check_z(cpu, data & cpu.r.a);
      data |= cpu.r.a;
      cpu.mmu.store_word(memory_location, data);
    }
  }
};

var BIT_const = {
  bytes_required:function(cpu) {
    if(cpu.p.e||cpu.p.m)
      return 2;
    else
      return 3;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=2;

    var and_result;
    if(cpu.p.e||cpu.p.m) {
      cpu.p.n = bytes[0] >> 7;
      cpu.p.v = (bytes[0] >> 6) & 0x1;
      and_result = cpu.r.a & bytes[0];
    } else {
      cpu.cycle_count++;
      cpu.p.n = bytes[1] >> 7;
      cpu.p.v = (bytes[1] >> 6) & 0x1;
      and_result = cpu.r.a & ((bytes[1]<<8)|bytes[0]);
    }

    cpu_lib.r.p.check_z(cpu, and_result);
  }
};

var BIT_absolute = new cpu_lib.addressing.Absolute(BIT_const);

var BIT_direct_page = new cpu_lib.addressing.Direct_page(BIT_const);

var BIT_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=2;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    if(cpu.p.e) {
      var memory_location = (bytes[0] + cpu.r.x) & 0xff,
          low_byte_loc = cpu.mmu.read_byte_long(memory_location+cpu.r.d, 0),
          high_byte_read_location = ((memory_location+1)&0xff)+cpu.r.d,
          high_byte_loc = cpu.mmu.read_byte_long(high_byte_read_location, 0);
      BIT_const.execute(cpu, [cpu.mmu.read_byte((high_byte_loc<<8) |
                                                 low_byte_loc)]);
    } else if(cpu.p.m) {
      var memory_location = bytes[0] + cpu.r.d + cpu.r.x,
          args = [cpu.mmu.read_byte(cpu.mmu.read_word(memory_location))];
      BIT_const.execute(cpu, args);
    } else {
      var memory_location = bytes[0] + cpu.r.d + cpu.r.x,
          absolute_location = cpu.mmu.read_word(memory_location),
          low_byte = cpu.mmu.read_byte(absolute_location),
          high_byte;
      absolute_location++;
      if(absolute_location&0x10000) {
        high_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
      } else {
        high_byte = cpu.mmu.read_byte(absolute_location);
      }
      BIT_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var BIT_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var original_location = (bytes[1]<<8)|bytes[0],
        memory_location = original_location+cpu.r.x;

    if((original_location&0xff00)!==(memory_location&0xff00))
      cpu.cycle_count++;

    BIT_absolute.execute(cpu, [memory_location&0xff, memory_location>>8]);
  }
};

var COP = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu) {
    cpu.cycle_count+=7;

    if(cpu.p.e===0)
      cpu.cycle_count++;

    cpu.interrupt = cpu.INTERRUPT.COP;
  }
};

var BRK = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu) {
    cpu.cycle_count+=7;

    if(cpu.p.e===0)
      cpu.cycle_count++;

    cpu.interrupt = cpu.INTERRUPT.BRK;
    if(cpu.p.e)
      cpu.p.m = 1;
  }
};

var RTI = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=6;

    if(cpu.p.e===0)
      cpu.cycle_count++;

    var p_byte = cpu.mmu.pull_byte(),
        pc_low = cpu.mmu.pull_byte(),
        pc_high = cpu.mmu.pull_byte();
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
    cpu.cycle_count+=7;

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
    if(cpu.p.e||cpu.p.x) {
      cpu.r.x &= 0x00ff;
      cpu.r.y &= 0x00ff;
    } else {
      cpu.r.x &= 0xffff;
      cpu.r.y &= 0xffff;
    }

    if(cpu.r.a!==0) {
      cpu.r.a--;
      cpu.r.pc-=3;
    } else {
      if(cpu.p.e||cpu.p.m)
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
    cpu.cycle_count+=7;

    // TODO: One piece of reference material I've read claims that this
    // operation should always work with a 16-bit accumulator even if in
    // emulation mode or the m bit is set to 1, in those cases it claims that
    // you should concatenate the B "hidden" register with A.  I'm going to
    // need to test this claim out somehow.
    var b = cpu.mmu.read_byte_long(cpu.r.x,bytes[1]);
    cpu.r.dbr = bytes[0];
    cpu.mmu.store_byte(cpu.r.y,b);

    var index_register_wrap;
    if(cpu.p.e||cpu.p.x) {
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

    if(cpu.r.a!==0) {
      cpu.r.pc-=3;
      cpu.r.a--;
    } else {
      if(cpu.p.e||cpu.p.m)
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
    cpu.cycle_count+=8;

    var memory_location = cpu.r.pc - 1;
    cpu.mmu.push_byte(cpu.r.k);
    cpu.mmu.push_byte(memory_location>>8);
    cpu.mmu.push_byte(memory_location&0x00ff);
    cpu.r.k = bytes[2];
    cpu.r.pc = (bytes[1]<<8)|bytes[0];
  }
};

var RTL = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=6;

    var low_byte = cpu.mmu.pull_byte(),
        high_byte = cpu.mmu.pull_byte();
    cpu.r.k = cpu.mmu.pull_byte();
    cpu.r.pc = ((high_byte<<8)|low_byte) + 1;
  }
};

var JSR = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=6;

    var memory_location = cpu.r.pc - 1;
    cpu.mmu.push_byte(memory_location>>8);
    cpu.mmu.push_byte(memory_location&0xff);
    cpu.r.pc = (bytes[1]<<8)|bytes[0];
  }
};

var JSR_absolute_indexed_x_indirect = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=8;

    var memory_location = ((bytes[1]<<8)|bytes[0])+cpu.r.x,
        bank = cpu.r.k;
    if(memory_location&0x10000) {
       bank++;
    }
    memory_location &= 0xffff;
    var indirect_location = cpu.mmu.read_word_long(memory_location, bank),
        low_byte = cpu.mmu.read_byte(indirect_location);
    bank = cpu.r.k;
    if(indirect_location===0xffff) {
      indirect_location = 0;
      bank++;
    } else {
      indirect_location++;
    }
    var high_byte = cpu.mmu.read_byte_long(indirect_location, bank);
    JSR.execute(cpu, [low_byte, high_byte]);
  }
};

var RTS = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=6;

    var low_byte = cpu.mmu.pull_byte(),
        high_byte = cpu.mmu.pull_byte();
    cpu.r.pc = ((high_byte<<8)|low_byte) + 1;
  }
};

var PER = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu,bytes) {
    cpu.cycle_count+=6;

    var address = ((bytes[1]<<8)|bytes[0]) + cpu.r.pc;
    cpu.mmu.push_byte(address>>8);
    cpu.mmu.push_byte(address&0xff);
  }
};

var PHK = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=3;

    cpu.mmu.push_byte(cpu.r.k);
  }
};

var PHD = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=4;

    cpu.mmu.push_byte(cpu.r.d>>8);
    cpu.mmu.push_byte(cpu.r.d&0xff);
  }
};

var PLD = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=5;

    var low_byte = cpu.mmu.pull_byte(),
        high_byte = cpu.mmu.pull_byte();
    cpu.r.d = (high_byte<<8)|low_byte;

    cpu.p.n = cpu.r.d >> 15;

    cpu_lib.r.p.check_z(cpu, cpu.r.d);
  }
};

var PHB = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=3;
    cpu.mmu.push_byte(cpu.r.dbr);
  }
};

var PLB = {
   bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=4;

    cpu.r.dbr = cpu.mmu.pull_byte();
    cpu.p.n = cpu.r.dbr >> 7;
    cpu_lib.r.p.check_z(cpu.r.dbr);
  }
};

var PEA = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=5;

    cpu.mmu.push_byte(bytes[1]);
    cpu.mmu.push_byte(bytes[0]);
  }
};

var PEI = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=6;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0]+cpu.r.d;
    cpu.mmu.push_byte(cpu.mmu.read_byte(memory_location+1));
    cpu.mmu.push_byte(cpu.mmu.read_byte(memory_location));
  }
};

var PHP = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=3;

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
    cpu.cycle_count+=4;

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
    cpu.cycle_count+=3;

    if(cpu.p.e||cpu.p.x) {
      cpu.mmu.push_byte(cpu.r.x);
    } else {
      cpu.cycle_count++;

      cpu.mmu.push_byte(cpu.r.x>>8);
      cpu.mmu.push_byte(cpu.r.x&0xff);
    }
  }
};

var PLX = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=4;

    if(cpu.p.e||cpu.p.x) {
      cpu.r.x = cpu.mmu.pull_byte();
      cpu.p.n = cpu.r.x >> 7;
    } else {
      cpu.cycle_count++;
      var low_byte = cpu.mmu.pull_byte(),
          high_byte = cpu.mmu.pull_byte();
      cpu.r.x = (high_byte<<8)|low_byte;
      cpu.p.n = cpu.r.x >> 15;
    }

    cpu_lib.r.p.check_z(cpu, cpu.r.x);
  }
};

var PHY = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=3;

    if(cpu.p.e||cpu.p.x) {
      cpu.mmu.push_byte(cpu.r.y);
    } else {
      cpu.cycle_count++;
      cpu.mmu.push_byte(cpu.r.y>>8);
      cpu.mmu.push_byte(cpu.r.y&0xff);
    }
  }
};

var PLY = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=4;

    if(cpu.p.e||cpu.p.x) {
      cpu.r.y = cpu.mmu.pull_byte();
      cpu.p.n = cpu.r.y >> 7;
    } else {
      cpu.cycle_count++;
      var low_byte = cpu.mmu.pull_byte(),
          high_byte = cpu.mmu.pull_byte();
      cpu.r.y = (high_byte<<8)|low_byte;
      cpu.p.n = cpu.r.y >> 15;
    }

    cpu_lib.r.p.check_z(cpu, cpu.r.y);
  }
};

var PHA = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=3;

    if(cpu.p.e||cpu.p.m) {
      cpu.mmu.push_byte(cpu.r.a);
    } else {
      cpu.cycle_count++;

      cpu.mmu.push_byte(cpu.r.a>>8);
      cpu.mmu.push_byte(cpu.r.a&0xff);
    }
  }
};

var PLA = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=4;

    if(cpu.p.e||cpu.p.m) {
      cpu.r.a = cpu.mmu.pull_byte();
      cpu.p.n = cpu.r.a >> 7;
    } else {
      cpu.cycle_count++;

      var low_byte = cpu.mmu.pull_byte(),
          high_byte = cpu.mmu.pull_byte();
      cpu.r.a = (high_byte<<8)|low_byte;
      cpu.p.n = cpu.r.a >> 15;
    }

    cpu_lib.r.p.check_z(cpu, cpu.r.a);
  }
};

var ROR_accumulator = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=2;

    var old_c = cpu.p.c;
    if(cpu.p.e||cpu.p.m) {
      cpu.p.c = cpu.r.a & 0x01;
      cpu.r.a = cpu.r.a >> 1;
      cpu.r.a &= 0x7f;
      cpu.r.a |= (old_c<<7);
      cpu.p.n = cpu.r.a >> 7;
    } else {
      cpu.p.c = cpu.r.a & 0x0001;
      cpu.r.a = cpu.r.a >> 1;
      cpu.r.a &= 0x7fff;
      cpu.r.a |= (old_c<<15);
      cpu.p.n = cpu.r.a >> 15;
    }

    cpu_lib.r.p.check_z(cpu, cpu.r.a);
  }
};

var ROR_absolute = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu,bytes) {
    cpu.cycle_count+=6;

    var memory_location = (bytes[1]<<8)|bytes[0],
        old_c = cpu.p.c,
        shiftee;
    if(cpu.p.e||cpu.p.m) {
      shiftee = cpu.mmu.read_byte(memory_location);
      cpu.p.c = shiftee & 0x01;
      shiftee = shiftee >> 1;
      shiftee &= 0x7f;
      shiftee |= (old_c<<7);
      cpu.p.n = shiftee >> 7;
      cpu.mmu.store_byte(memory_location, shiftee);
    } else {
      cpu.cycle_count+=2;

      shiftee = cpu.mmu.read_word(memory_location);
      cpu.p.c = shiftee & 0x0001;
      shiftee = shiftee >> 1;
      shiftee &= 0x7fff;
      shiftee |= (old_c<<15);
      cpu.p.n = shiftee >> 15;
      cpu.mmu.store_word(memory_location, shiftee);
    }

    cpu_lib.r.p.check_z(cpu, shiftee);
  }
};

var ROR_direct_page = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu,bytes) {
    cpu.cycle_count+=5;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0]+cpu.r.d,
        old_c = cpu.p.c,
        shiftee;
    if(cpu.p.e||cpu.p.m) {
      shiftee = cpu.mmu.read_byte(memory_location);
      cpu.p.c = shiftee & 0x01;
      shiftee = shiftee >> 1;
      shiftee &= 0x7f;
      shiftee |= (old_c<<7);
      cpu.p.n = shiftee >> 7;
      cpu.mmu.store_byte(memory_location, shiftee);
    } else {
      cpu.cycle_count+=2;

      shiftee = cpu.mmu.read_word(memory_location);
      cpu.p.c = shiftee & 0x0001;
      shiftee = shiftee >> 1;
      shiftee &= 0x7fff;
      shiftee |= (old_c<<15);
      cpu.p.n = shiftee >> 15;
      cpu.mmu.store_word(memory_location, shiftee);
    }

    cpu_lib.r.p.check_z(cpu, shiftee);
  }
};

var ROR_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count++;

    var memory_location = ((bytes[1]<<8)|bytes[0])+cpu.r.x;
    ROR_absolute.execute(cpu, [memory_location&0xff, memory_location>>8]);
  }
};

var ROR_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count++;

    ROR_direct_page.execute(cpu, [bytes[0]+cpu.r.x]);
  }
};

var ROL_accumulator = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=2;

    var old_c = cpu.p.c;
    if(cpu.p.e||cpu.p.m) {
      cpu.p.c = cpu.r.a >> 7;
      cpu.r.a = cpu.r.a << 1;
      cpu.r.a &= 0xfe;
      cpu.r.a |= old_c;
      cpu.p.n = cpu.r.a >> 7;
    } else {
      cpu.p.c = cpu.r.a >> 15;
      cpu.r.a = cpu.r.a << 1;
      cpu.r.a &= 0xfffe;
      cpu.r.a |= old_c;
      cpu.p.n = cpu.r.a >> 15;
    }

    cpu_lib.r.p.check_z(cpu, cpu.r.a);
  }
};

var ROL_absolute = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=6;

    var memory_location = (bytes[1]<<8)|bytes[0],
        old_c = cpu.p.c,
        shiftee;
    if(cpu.p.e||cpu.p.m) {
      shiftee = cpu.mmu.read_byte(memory_location);
      cpu.p.c = shiftee >> 7;
      shiftee = shiftee << 1;
      shiftee &= 0xfe;
      shiftee |= old_c;
      cpu.p.n = shiftee >> 7;
      cpu.mmu.store_byte(memory_location, shiftee);
    } else {
      cpu.cycle_count+=2;

      shiftee = cpu.mmu.read_word(memory_location);
      cpu.p.c = shiftee >> 15;
      shiftee = shiftee << 1;
      shiftee &= 0xfffe;
      shiftee |= old_c;
      cpu.p.n = shiftee >> 15;
      cpu.mmu.store_word(memory_location, shiftee);
    }

    cpu_lib.r.p.check_z(cpu, shiftee);
  }
};

var ROL_direct_page = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=5;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0]+cpu.r.d,
        old_c = cpu.p.c,
        shiftee;
    if(cpu.p.e||cpu.p.m) {
      shiftee = cpu.mmu.read_byte(memory_location);
      cpu.p.c = shiftee >> 7;
      shiftee = shiftee << 1;
      shiftee &= 0xfe;
      shiftee |= old_c;
      cpu.p.n = shiftee >> 7;
      cpu.mmu.store_byte(memory_location, shiftee);
    } else {
      cpu.cycle_count+=2;

      shiftee = cpu.mmu.read_word(memory_location);
      cpu.p.c = shiftee >> 15;
      shiftee = shiftee << 1;
      shiftee &= 0xfffe;
      shiftee |= old_c;
      cpu.p.n = shiftee >> 15;
      cpu.mmu.store_word(memory_location, shiftee);
    }

    cpu_lib.r.p.check_z(cpu, shiftee);
  }
};

var ROL_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count++;

    var memory_location = ((bytes[1]<<8)|bytes[0])+cpu.r.x;
    ROL_absolute.execute(cpu, [memory_location&0xff, memory_location>>8]);
  }
};

var ROL_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count++;

    ROL_direct_page.execute(cpu, [bytes[0]+cpu.r.x]);
  }
};

var ASL_accumulator = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=2;

    if(cpu.p.e||cpu.p.m) {
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

    cpu_lib.r.p.check_z(cpu, cpu.r.a);
  }
};

var ASL_absolute = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=6;

    var memory_location = (bytes[1]<<8)|bytes[0],
        shiftee;
    if(cpu.p.e||cpu.p.m) {
      shiftee = cpu.mmu.read_byte(memory_location);
      cpu.p.c = shiftee >> 7;
      shiftee = shiftee << 1;
      shiftee &= 0xff;
      cpu.p.n = shiftee >> 7;
      cpu.mmu.store_byte(memory_location, shiftee);
    } else {
      cpu.cycle_count+=2;
      shiftee = cpu.mmu.read_word(memory_location);
      cpu.p.c = shiftee >> 15;
      shiftee = shiftee << 1;
      shiftee &= 0xffff;
      cpu.p.n = shiftee >> 15;
      cpu.mmu.store_word(memory_location, shiftee);
    }

    cpu_lib.r.p.check_z(cpu, shiftee);
  }
};

var ASL_direct_page = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu,bytes) {
    cpu.cycle_count+=5;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0]+cpu.r.d,
        shiftee;
    if(cpu.p.e||cpu.p.m) {
      shiftee = cpu.mmu.read_byte(memory_location);
      cpu.p.c = shiftee >> 7;
      shiftee = shiftee << 1;
      shiftee &= 0xff;
      cpu.p.n = shiftee >> 7;
      cpu.mmu.store_byte(memory_location, shiftee);
    } else {
      cpu.cycle_count+=2;

      shiftee = cpu.mmu.read_word(memory_location);
      cpu.p.c = shiftee >> 15;
      shiftee = shiftee << 1;
      shiftee &= 0xffff;
      cpu.p.n = shiftee >> 15;
      cpu.mmu.store_word(memory_location, shiftee);
    }

    cpu_lib.r.p.check_z(cpu, shiftee);
  }
};

var ASL_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count++;

    var memory_location = ((bytes[1]<<8)|bytes[0])+cpu.r.x;
    ASL_absolute.execute(cpu, [memory_location&0xff, memory_location>>8]);
  }
};

var ASL_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count++;

    ASL_direct_page.execute(cpu, [bytes[0]+cpu.r.x]);
  }
};

var LSR_accumulator = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=2;

    cpu.p.c = cpu.r.a & 1;
    cpu.r.a = cpu.r.a >> 1;

    cpu.p.n = 0;
    cpu_lib.r.p.check_z(cpu, cpu.r.a);
  }
};

var LSR_absolute = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=6;

    var memory_location = (bytes[1]<<8)|bytes[0],
        shiftee;
    if(cpu.p.e||cpu.p.m) {
      shiftee = cpu.mmu.read_byte(memory_location);
      cpu.p.c = shiftee & 0x0001;
      shiftee = shiftee >> 1;
      cpu.mmu.store_byte(memory_location, shiftee);
    } else {
      cpu.cycle_count+=2;

      shiftee = cpu.mmu.read_word(memory_location);
      cpu.p.c = cpu.r.a & 0x01;
      shiftee = shiftee >> 1;
      cpu.mmu.store_word(memory_location, shiftee);
    }

    cpu.p.n = 0;
    cpu_lib.r.p.check_z(cpu, shiftee);
  }
};

var LSR_direct_page = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=5;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        shiftee;
    if(cpu.p.e||cpu.p.m) {
      shiftee = cpu.mmu.read_byte(memory_location);
      cpu.p.c = shiftee & 0x0001;
      shiftee = shiftee >> 1;
      cpu.mmu.store_byte(memory_location, shiftee);
    } else {
      cpu.cycle_count+=2;

      shiftee = cpu.mmu.read_word(memory_location);
      cpu.p.c = cpu.r.a & 0x01;
      shiftee = shiftee >> 1;
      cpu.mmu.store_word(memory_location, shiftee);
    }

    cpu.p.n = 0;
    cpu_lib.r.p.check_z(cpu, shiftee);
  }
};

var LSR_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count++;

    var memory_location = ((bytes[1]<<8)|bytes[0])+cpu.r.x;
    LSR_absolute.execute(cpu, [memory_location&0x00ff, memory_location>>8]);
  }
};

var LSR_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count++;
    LSR_direct_page.execute(cpu, [bytes[0]+cpu.r.x]);
  }
};

var EOR_const = {
  bytes_required:function(cpu) {
    if(cpu.p.e||cpu.p.m) {
      return 2;
    } else {
      return 3;
    }
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=2;

    if(cpu.p.e||cpu.p.m) {
      cpu.r.a ^= bytes[0];
      cpu.p.n = cpu.r.a >> 7;
    } else {
      cpu.cycle_count++;
      cpu.r.a ^= (bytes[1]<<8)|bytes[0];
      cpu.p.n = cpu.r.a >> 15;
    }

    cpu_lib.r.p.check_z(cpu, cpu.r.a);
  }
};

var EOR_absolute = new cpu_lib.addressing.Absolute(EOR_const);

var EOR_absolute_long = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=3;

    var memory_location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.e||cpu.p.m) {
      EOR_const.execute(cpu, [cpu.mmu.read_byte_long(memory_location, bytes[2])]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(memory_location, bytes[2]),
          high_byte = cpu.mmu.read_byte_long(memory_location+1, bytes[2]);
      EOR_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var EOR_absolute_long_indexed_x = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=3;

    var memory_location = ((bytes[1]<<8)|bytes[0]) + cpu.r.x;
    if(memory_location & 0x10000) {
      bytes[2]++;
      memory_location &= 0xffff;
    }

    if(cpu.p.e||cpu.p.m) {
      EOR_const.execute(cpu, [cpu.mmu.read_byte_long(memory_location, bytes[2])]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(memory_location, bytes[2]);
      memory_location++;
      if(memory_location & 0x10000) {
        bytes[2]++;
        memory_location &= 0xffff;
      }
      var high_byte = cpu.mmu.read_byte_long(memory_location, bytes[2]);
      EOR_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var EOR_direct_page = new cpu_lib.addressing.Direct_page(EOR_const);

var EOR_direct_page_indirect = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=3;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        absolute_location = cpu.mmu.read_word(memory_location);
    if(cpu.p.e||cpu.p.m) {
      EOR_const.execute(cpu, [cpu.mmu.read_byte(absolute_location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(absolute_location),
          high_byte = cpu.mmu.read_byte(absolute_location+1);
      EOR_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var EOR_direct_page_indexed_x_indirect = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=4;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    if(cpu.p.e) {
      var memory_location = (bytes[0] + cpu.r.x) & 0xff,
          low_byte_loc = cpu.mmu.read_byte_long(memory_location+cpu.r.d, 0),
          high_byte_read_loc = ((memory_location+1)&0xff)+cpu.r.d,
          high_byte_loc = cpu.mmu.read_byte_long(high_byte_read_loc, 0);
      EOR_const.execute(cpu, [cpu.mmu.read_byte((high_byte_loc<<8) |
                                                 low_byte_loc)]);
    } else if(cpu.p.m) {
      var memory_location = bytes[0] + cpu.r.d + cpu.r.x,
          low_byte_loc = cpu.mmu.read_byte(memory_location),
          high_byte_loc = cpu.mmu.read_byte(memory_location+1);
      EOR_const.execute(cpu, [cpu.mmu.read_byte((high_byte_loc<<8) |
                                                 low_byte_loc)]);
    } else {
      var memory_location = bytes[0] + cpu.r.d + cpu.r.x,
          absolute_location = cpu.mmu.read_word(memory_location),
          low_byte = cpu.mmu.read_byte(absolute_location),
          high_byte;
      absolute_location++;
      if(absolute_location&0x10000) {
        high_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
      } else {
        high_byte = cpu.mmu.read_byte(absolute_location);
      }
      EOR_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var EOR_direct_page_indirect_long_indexed_y = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=4;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        bank_byte = cpu.mmu.read_byte(memory_location+2),
        absolute_location = cpu.mmu.read_word(memory_location) + cpu.r.y;
    if(absolute_location >> 16) {
      absolute_location &= 0xffff;
      bank_byte++;
    }
    if(cpu.p.e||cpu.p.m) {
      EOR_const.execute(cpu, [cpu.mmu.read_byte_long(absolute_location,
                                                     bank_byte)]);
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
    cpu.cycle_count+=4;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        bank_byte = cpu.mmu.read_byte(memory_location+2),
        absolute_location = cpu.mmu.read_word(memory_location);
    if(cpu.p.e||cpu.p.m) {
      EOR_const.execute(cpu, [cpu.mmu.read_byte_long(absolute_location,
                                                     bank_byte)]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte),
          high_byte = cpu.mmu.read_byte_long(absolute_location+1, bank_byte);
      EOR_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var EOR_direct_page_indirect_indexed_y = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=3;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        original_location = cpu.mmu.read_word(memory_location),
        absolute_location = original_location + cpu.r.y;

    if((original_location&0xff00)!==(absolute_location&0xff00))
      cpu.cycle_count++;

    if(cpu.p.e||cpu.p.m) {
      EOR_const.execute(cpu, [cpu.mmu.read_byte(absolute_location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(absolute_location),
          high_byte = cpu.mmu.read_byte(absolute_location+1);
      EOR_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var EOR_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var original_location = (bytes[1]<<8)|bytes[0],
        memory_location = original_location+cpu.r.x;

    if((original_location&0xff00)!==(memory_location&0xff00))
      cpu.cycle_count++;

    EOR_absolute.execute(cpu, [memory_location&0x00ff, memory_location>>8]);
  }
};

var EOR_absolute_indexed_y = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var original_location = (bytes[1]<<8)|bytes[0],
        memory_location = original_location+cpu.r.y;

    if((original_location&0xff00)!==(memory_location&0xff00))
      cpu.cycle_count++;

    EOR_absolute.execute(cpu, [memory_location&0x00ff, memory_location>>8]);
  }
};

var EOR_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count++;

    EOR_direct_page.execute(cpu, [bytes[0]+cpu.r.x]);
  }
};

var EOR_stack_relative = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=2;

    if(cpu.p.e) {
      var memory_location = 0x100 | ((cpu.r.s + bytes[0]) & 0xff);
      EOR_const.execute(cpu, [cpu.mmu.read_byte(memory_location)]);
    } else {
      if(cpu.p.m) {
        EOR_const.execute(cpu, [cpu.mmu.read_byte(cpu.r.s+bytes[0])]);
      } else {
        var memory_location = cpu.r.s + bytes[0],
            low_byte = cpu.mmu.read_byte(memory_location),
            high_byte = cpu.mmu.read_byte(memory_location+1);
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
    cpu.cycle_count+=5;

    if(cpu.p.e) {
      var location_loc = 0x100 | ((cpu.r.s + bytes[0]) & 0xff),
          low_byte =  cpu.mmu.read_byte(location_loc),
          high_byte;
      if(location_loc===0x1ff) {
        high_byte = cpu.mmu.read_byte(0x100);
      } else {
        high_byte = cpu.mmu.read_byte(location_loc+1);
      }
      var absolute_location = ((high_byte<<8)|low_byte)+cpu.r.y,
          b;
      if(absolute_location>=0x10000) {
        b = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
      } else {
        b = cpu.mmu.read_byte(absolute_location);
      }
      EOR_const.execute(cpu, [b]);
    } else {
      var location_loc = (cpu.r.s + bytes[0]) & 0xffff,
          absolute_location = cpu.mmu.read_word(location_loc) + cpu.r.y;
      if(cpu.p.m) {
        var b;
        if(absolute_location>=0x10000) {
          b = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
        } else {
          b = cpu.mmu.read_byte(absolute_location);
        }
        EOR_const.execute(cpu, [b]);
      } else {
        var low_byte, high_byte;
        if(absolute_location>=0x10000) {
          absolute_location &= 0xffff;
          low_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
          high_byte = cpu.mmu.read_byte_long(absolute_location+1, cpu.r.dbr+1);
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
    if(cpu.p.e||cpu.p.m) {
      return 2;
    } else {
      return 3;
    }
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=2;

    if(cpu.p.e||cpu.p.m) {
      cpu.r.a |= bytes[0];
      cpu.p.n = cpu.r.a >> 7;
    } else {
      cpu.cycle_count++;

      cpu.r.a |= (bytes[1]<<8)|bytes[0];
      cpu.p.n = cpu.r.a >> 15;
    }

    cpu_lib.r.p.check_z(cpu, cpu.r.a);
  }
};

var ORA_absolute = new cpu_lib.addressing.Absolute(ORA_const);

var ORA_absolute_long = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=3;

    var memory_location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.e||cpu.p.m) {
      ORA_const.execute(cpu, [cpu.mmu.read_byte_long(memory_location,
                                                     bytes[2])]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(memory_location, bytes[2]),
          high_byte = cpu.mmu.read_byte_long(memory_location+1, bytes[2]);
      ORA_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var ORA_absolute_long_indexed_x = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=3;

    var memory_location = ((bytes[1]<<8)|bytes[0]) + cpu.r.x;
    if(memory_location & 0x10000) {
      bytes[2]++;
      memory_location &= 0xffff;
    }

    if(cpu.p.e||cpu.p.m) {
      ORA_const.execute(cpu, [cpu.mmu.read_byte_long(memory_location, bytes[2])]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(memory_location, bytes[2]);
      memory_location++;
      if(memory_location & 0x10000) {
        bytes[2]++;
        memory_location &= 0xffff;
      }
      var high_byte = cpu.mmu.read_byte_long(memory_location, bytes[2]);
      ORA_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var ORA_direct_page = new cpu_lib.addressing.Direct_page(ORA_const);

var ORA_direct_page_indirect = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=3;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        absolute_location = cpu.mmu.read_word(memory_location);
    if(cpu.p.e||cpu.p.m) {
      ORA_const.execute(cpu, [cpu.mmu.read_byte(absolute_location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(absolute_location),
          high_byte = cpu.mmu.read_byte(absolute_location+1);
      ORA_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var ORA_direct_page_indexed_x_indirect = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=4;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    if(cpu.p.e) {
      var memory_location = (bytes[0] + cpu.r.x) & 0xff,
          low_byte_loc = cpu.mmu.read_byte_long(memory_location+cpu.r.d, 0),
          high_byte_read_loc = ((memory_location+1)&0xff)+cpu.r.d,
          high_byte_loc = cpu.mmu.read_byte_long(high_byte_read_loc, 0);
      ORA_const.execute(cpu, [cpu.mmu.read_byte((high_byte_loc<<8) |
                                                 low_byte_loc)]);
    } else if(cpu.p.m) {
      var memory_location = bytes[0] + cpu.r.d + cpu.r.x,
          low_byte_loc = cpu.mmu.read_byte(memory_location),
          high_byte_loc = cpu.mmu.read_byte(memory_location+1);
      ORA_const.execute(cpu, [cpu.mmu.read_byte((high_byte_loc<<8) |
                                                 low_byte_loc)]);
    } else {
      var memory_location = bytes[0] + cpu.r.d + cpu.r.x,
          absolute_location = cpu.mmu.read_word(memory_location),
          low_byte = cpu.mmu.read_byte(absolute_location),
          high_byte;
      absolute_location++;
      if(absolute_location&0x10000) {
        high_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
      } else {
        high_byte = cpu.mmu.read_byte(absolute_location);
      }
      ORA_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var ORA_direct_page_indirect_long = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=4;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        bank_byte = cpu.mmu.read_byte(memory_location+2),
        absolute_location = cpu.mmu.read_word(memory_location);
    if(cpu.p.e||cpu.p.m) {
      ORA_const.execute(cpu, [cpu.mmu.read_byte_long(absolute_location,
                                                     bank_byte)]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte),
          high_byte = cpu.mmu.read_byte_long(absolute_location+1, bank_byte);
      ORA_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var ORA_direct_page_indirect_long_indexed_y = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=4;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        bank_byte = cpu.mmu.read_byte(memory_location+2),
        absolute_location = cpu.mmu.read_word(memory_location) + cpu.r.y;
    if(absolute_location >> 16) {
      absolute_location &= 0xffff;
      bank_byte++;
    }
    if(cpu.p.e||cpu.p.m) {
      ORA_const.execute(cpu, [cpu.mmu.read_byte_long(absolute_location,
                              bank_byte)]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte);
      absolute_location++;
      if(absolute_location >> 16) {
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
    cpu.cycle_count+=3;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        original_location = cpu.mmu.read_word(memory_location),
        absolute_location = original_location + cpu.r.y;

    if((original_location&0xff00)!==(absolute_location&0xff00))
      cpu.cycle_count++;

    if(cpu.p.e||cpu.p.m) {
      ORA_const.execute(cpu, [cpu.mmu.read_byte(absolute_location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(absolute_location),
          high_byte = cpu.mmu.read_byte(absolute_location+1);
      ORA_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var ORA_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var original_location = (bytes[1]<<8)|bytes[0],
        memory_location = original_location+cpu.r.x;

    if((memory_location&0xff00)!==(original_location&0xff00))
      cpu.cycle_count++;

    var location_high_byte = memory_location >> 8,
        location_low_byte = memory_location & 0xff;
    ORA_absolute.execute(cpu, [location_low_byte, location_high_byte]);
  }
};

var ORA_absolute_indexed_y = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var original_location = (bytes[1]<<8)|bytes[0],
        memory_location = original_location+cpu.r.y;

    if((original_location&0xff00)!==(memory_location&0xff00))
      cpu.cycle_count++;

    ORA_absolute.execute(cpu, [memory_location&0xff, memory_location>>8]);
  }
};

var ORA_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count++;

    ORA_direct_page.execute(cpu, [bytes[0]+cpu.r.x]);
  }
};

var ORA_stack_relative = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=2;

    if(cpu.p.e) {
      var memory_location = 0x100 | ((cpu.r.s + bytes[0]) & 0xff);
      ORA_const.execute(cpu, [cpu.mmu.read_byte(memory_location)]);
    } else {
      if(cpu.p.m) {
        ORA_const.execute(cpu, [cpu.mmu.read_byte(cpu.r.s+bytes[0])]);
      } else {
        var memory_location = cpu.r.s + bytes[0],
            low_byte = cpu.mmu.read_byte(memory_location),
            high_byte = cpu.mmu.read_byte(memory_location+1);
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
    cpu.cycle_count+=5;

    if(cpu.p.e) {
      var location_loc = 0x100 | ((cpu.r.s + bytes[0]) & 0xff),
          low_byte =  cpu.mmu.read_byte(location_loc),
          high_byte;
      if(location_loc===0x1ff) {
        high_byte = cpu.mmu.read_byte(0x100);
      } else {
        high_byte = cpu.mmu.read_byte(location_loc+1);
      }
      var absolute_location = ((high_byte<<8)|low_byte)+cpu.r.y,
          b;
      if(absolute_location>=0x10000) {
        b = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
      } else {
        b = cpu.mmu.read_byte(absolute_location);
      }
      ORA_const.execute(cpu, [b]);
    } else {
      var location_loc = (cpu.r.s + bytes[0]) & 0xffff,
          absolute_location = cpu.mmu.read_word(location_loc);
      absolute_location += cpu.r.y;
      if(cpu.p.m) {
        var b;
        if(absolute_location>=0x10000) {
          b = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
        } else {
          b = cpu.mmu.read_byte(absolute_location);
        }
        ORA_const.execute(cpu, [b]);
      } else {
        var low_byte, high_byte;
        if(absolute_location>=0x10000) {
          low_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
          high_byte = cpu.mmu.read_byte_long(absolute_location+1, cpu.r.dbr+1);
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
    if(cpu.p.e||cpu.p.m) {
      return 2;
    } else {
      return 3;
    }
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=2;

    if(cpu.p.e||cpu.p.m) {
      cpu.r.a &= bytes[0];
      cpu.p.n = cpu.r.a >> 7;
    } else {
      cpu.cycle_count++;

      cpu.r.a &= (bytes[1]<<8)|bytes[0];
      cpu.p.n = cpu.r.a >> 15;
    }

    cpu_lib.r.p.check_z(cpu, cpu.r.a);
  }
};

var AND_absolute = new cpu_lib.addressing.Absolute(AND_const);

var AND_absolute_long = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=3;

    var memory_location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.e||cpu.p.m) {
      AND_const.execute(cpu, [cpu.mmu.read_byte_long(memory_location, bytes[2])]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(memory_location, bytes[2]),
          high_byte = cpu.mmu.read_byte_long(memory_location+1, bytes[2]);
      AND_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var AND_absolute_long_indexed_x = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=3;

    var memory_location = ((bytes[1]<<8)|bytes[0]) + cpu.r.x;
    if(memory_location & 0x10000) {
      bytes[2]++;
      memory_location &= 0xffff;
    }

    if(cpu.p.e||cpu.p.m) {
      AND_const.execute(cpu, [cpu.mmu.read_byte_long(memory_location, bytes[2])]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(memory_location, bytes[2]);
      memory_location++;
      if(memory_location & 0x10000) {
        bytes[2]++;
        memory_location &= 0xffff;
      }
      var high_byte = cpu.mmu.read_byte_long(memory_location, bytes[2]);
      AND_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var AND_direct_page = new cpu_lib.addressing.Direct_page(AND_const);

var AND_direct_page_indirect = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=3;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        low_byte_loc = cpu.mmu.read_byte(memory_location),
        high_byte_loc = cpu.mmu.read_byte(memory_location+1),
        absolute_location = (high_byte_loc<<8) | low_byte_loc;
    if(cpu.p.e||cpu.p.m) {
      AND_const.execute(cpu, [cpu.mmu.read_byte(absolute_location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(absolute_location),
          high_byte = cpu.mmu.read_byte(absolute_location+1);
      AND_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var AND_direct_page_indexed_x_indirect = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=4;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    if(cpu.p.e) {
      var memory_location = (bytes[0] + cpu.r.x) & 0xff,
          low_byte_loc = cpu.mmu.read_byte_long(memory_location+cpu.r.d, 0),
          high_byte_read_loc = ((memory_location+1)&0xff)+cpu.r.d,
          high_byte_loc = cpu.mmu.read_byte_long(high_byte_read_loc, 0);
      AND_const.execute(cpu, [cpu.mmu.read_byte((high_byte_loc<<8) |
                                                low_byte_loc)]);
    } else if(cpu.p.m) {
      var memory_location = bytes[0] + cpu.r.d + cpu.r.x,
          low_byte_loc = cpu.mmu.read_byte(memory_location),
          high_byte_loc = cpu.mmu.read_byte(memory_location+1);
      AND_const.execute(cpu, [cpu.mmu.read_byte((high_byte_loc<<8)|
                                                low_byte_loc)]);
    } else {
      var memory_location = bytes[0] + cpu.r.d + cpu.r.x,
          absolute_location = cpu.mmu.read_word(memory_location),
          low_byte = cpu.mmu.read_byte(absolute_location),
          high_byte;
      absolute_location++;
      if(absolute_location&0x10000) {
        high_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
      } else {
        high_byte = cpu.mmu.read_byte(absolute_location);
      }
      AND_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var AND_direct_page_indirect_long = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=4;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        bank_byte = cpu.mmu.read_byte(memory_location+2),
        absolute_location = cpu.mmu.read_word(memory_location);
    if(cpu.p.e||cpu.p.m) {
      AND_const.execute(cpu, [cpu.mmu.read_byte_long(absolute_location,
                                                     bank_byte)]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte);
      var high_byte = cpu.mmu.read_byte_long(absolute_location+1, bank_byte);
      AND_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var AND_direct_page_indirect_long_indexed_y = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=4;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        bank_byte = cpu.mmu.read_byte(memory_location+2),
        absolute_location = cpu.mmu.read_word(memory_location) + cpu.r.y;
    if(absolute_location >> 16) {
      absolute_location &= 0xffff;
      bank_byte++;
    }
    if(cpu.p.e||cpu.p.m) {
      AND_const.execute(cpu, [cpu.mmu.read_byte_long(absolute_location,
                                                     bank_byte)]);
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
    cpu.cycle_count+=3;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        original_location = cpu.mmu.read_word(memory_location),
        absolute_location = original_location + cpu.r.y;

    if((original_location&0xff00)!==(absolute_location&0xff00))
      cpu.cycle_count++;

    if(cpu.p.e||cpu.p.m) {
      AND_const.execute(cpu, [cpu.mmu.read_byte(absolute_location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(absolute_location),
          high_byte = cpu.mmu.read_byte(absolute_location+1);
      AND_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var AND_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var original_location = (bytes[1]<<8)|bytes[0],
        memory_location = original_location+cpu.r.x;

    if((memory_location&0xff00)!==(original_location&0xff00))
      cpu.cycle_count++;

    AND_absolute.execute(cpu, [memory_location&0x00ff, memory_location>>8]);
  }
};

var AND_absolute_indexed_y = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var original_location = (bytes[1]<<8)|bytes[0],
        memory_location = original_location+cpu.r.y;

    if((original_location&0xff00)!==(memory_location&0xff00))
      cpu.cycle_count++;

    AND_absolute.execute(cpu, [memory_location&0x00ff, memory_location>>8]);
  }
};

var AND_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count++;

    AND_direct_page.execute(cpu, [bytes[0]+cpu.r.x]);
  }
};

var AND_stack_relative = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=2;

    if(cpu.p.e) {
      var memory_location = 0x100 | ((cpu.r.s + bytes[0]) & 0xff);
      AND_const.execute(cpu, [cpu.mmu.read_byte(memory_location)]);
    } else {
      if(cpu.p.m) {
        AND_const.execute(cpu, [cpu.mmu.read_byte(cpu.r.s+bytes[0])]);
      } else {
        var memory_location = cpu.r.s + bytes[0],
            low_byte = cpu.mmu.read_byte(memory_location),
            high_byte = cpu.mmu.read_byte(memory_location+1);
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
    cpu.cycle_count+=5;

    if(cpu.p.e) {
      var location_loc = 0x100 | ((cpu.r.s + bytes[0]) & 0xff),
          low_byte =  cpu.mmu.read_byte(location_loc),
          high_byte;
      if(location_loc===0x1ff) {
        high_byte = cpu.mmu.read_byte(0x100);
      } else {
        high_byte = cpu.mmu.read_byte(location_loc+1);
      }
      var absolute_location = ((high_byte<<8)|low_byte)+cpu.r.y,
          b;
      if(absolute_location>=0x10000) {
        b = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
      } else {
        b = cpu.mmu.read_byte(absolute_location);
      }
      AND_const.execute(cpu, [b]);
    } else {
      var location_loc = cpu.r.s + bytes[0],
          absolute_location = cpu.mmu.read_word(location_loc) + cpu.r.y;
      if(cpu.p.m) {
        var b;
        if(absolute_location>=0x10000) {
          b = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
        } else {
          b = cpu.mmu.read_byte(absolute_location);
        }
        AND_const.execute(cpu, [b]);
      } else {
        var low_byte, high_byte;
        if(absolute_location>=0x10000) {
          absolute_location &= 0xffff;
          low_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
          high_byte = cpu.mmu.read_byte_long(absolute_location+1, cpu.r.dbr+1);
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
    if(cpu.p.e||cpu.p.x) {
      return 2;
    } else {
      return 3;
    }
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=2;

    var result;
    if(cpu.p.e||cpu.p.x) {
      result = cpu.r.x - bytes[0];
      if(result<0) {
        cpu.p.c = 0;
        result = 0x100 + result;
      } else {
        cpu.p.c = 1;
      }
      cpu.p.n = result >> 7;
    } else {
      cpu.cycle_count++;

      result = cpu.r.x - ((bytes[1]<<8)|bytes[0]);
      if(result<0) {
        cpu.p.c = 0;
        result = 0x10000 + result;
      } else {
        cpu.p.c = 1;
      }
      cpu.p.n = result >> 15;
    }

    cpu_lib.r.p.check_z(cpu, result);
  }
};

var CPX_direct_page = new cpu_lib.addressing.Direct_page(CPX_const);

var CPX_absolute = new cpu_lib.addressing.Absolute(CPX_const);

var CPY_const = {
  bytes_required:function(cpu) {
    if(cpu.p.e||cpu.p.x) {
      return 2;
    } else {
      return 3;
    }
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=2;

    var result;
    if(cpu.p.e||cpu.p.x) {
      result = cpu.r.y - bytes[0];
      if(result<0) {
        cpu.p.c = 0;
        result = 0x100 + result;
      } else {
        cpu.p.c = 1;
      }
      cpu.p.n = result >> 7;
    } else {
      cpu.cycle_count++;
      result = cpu.r.y - ((bytes[1]<<8)|bytes[0]);
      if(result<0) {
        cpu.p.c = 0;
        result = 0x10000 + result;
      } else {
        cpu.p.c = 1;
      }
      cpu.p.n = result >> 15;
    }

    cpu_lib.r.p.check_z(cpu, result);
  }
};

var CPY_direct_page = new cpu_lib.addressing.Direct_page(CPY_const);

var CPY_absolute = new cpu_lib.addressing.Absolute(CPY_const);

var CMP_const = {
  bytes_required:function(cpu) {
    if(cpu.p.e||cpu.p.m) {
      return 2;
    } else {
      return 3;
    }
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=2;

    var result;
    if(cpu.p.e||cpu.p.m) {
      result = cpu.r.a - bytes[0];
      if(result<0) {
        cpu.p.c = 0;
        result = 0x100 + result;
      } else {
        cpu.p.c = 1;
      }
      cpu.p.n = result >> 7;
    } else {
      cpu.cycle_count++;

      result = cpu.r.a - ((bytes[1]<<8)|bytes[0]);
      if(result<0) {
        cpu.p.c = 0;
        result = 0x10000 + result;
      } else {
        cpu.p.c = 1;
      }
      cpu.p.n = result >> 15;
    }

    cpu_lib.r.p.check_z(cpu, result);
  }
};

var CMP_direct_page = new cpu_lib.addressing.Direct_page(CMP_const);

var CMP_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count++;

    CMP_direct_page.execute(cpu, [bytes[0]+cpu.r.x]);
  }
};

var CMP_direct_page_indirect = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=3;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        absolute_location = cpu.mmu.read_word(memory_location);
    if(cpu.p.e||cpu.p.m) {
      CMP_const.execute(cpu, [cpu.mmu.read_byte(absolute_location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(absolute_location),
          high_byte = cpu.mmu.read_byte(absolute_location+1);
      CMP_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var CMP_direct_page_indexed_x_indirect = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=4;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    if(cpu.p.e) {
      var memory_location = (bytes[0] + cpu.r.x) & 0xff,
          low_byte_loc = cpu.mmu.read_byte_long(memory_location+cpu.r.d, 0),
          high_byte_read_loc = ((memory_location+1)&0xff)+cpu.r.d,
          high_byte_loc = cpu.mmu.read_byte_long(high_byte_read_loc, 0);
      CMP_const.execute(cpu, [cpu.mmu.read_byte((high_byte_loc<<8) |
                                                low_byte_loc)]);
    } else if(cpu.p.m) {
      var memory_location = bytes[0] + cpu.r.d + cpu.r.x,
          low_byte_loc = cpu.mmu.read_byte(memory_location),
          high_byte_loc = cpu.mmu.read_byte(memory_location+1);
      CMP_const.execute(cpu, [cpu.mmu.read_byte((high_byte_loc<<8)|
                                                low_byte_loc)]);
    } else {
      var memory_location = bytes[0] + cpu.r.d + cpu.r.x,
          absolute_location = cpu.mmu.read_word(memory_location)+1,
          low_byte = cpu.mmu.read_byte(absolute_location),
          high_byte;
      if(absolute_location&0x10000) {
        high_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
      } else {
        high_byte = cpu.mmu.read_byte(absolute_location);
      }
      CMP_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var CMP_direct_page_indirect_long = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=4;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        bank_byte = cpu.mmu.read_byte(memory_location+2),
        absolute_location = cpu.mmu.read_word(memory_location);
    if(cpu.p.e||cpu.p.m) {
      CMP_const.execute(cpu, [cpu.mmu.read_byte_long(absolute_location,
                                                     bank_byte)]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte),
          high_byte = cpu.mmu.read_byte_long(absolute_location+1, bank_byte);
      CMP_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var CMP_direct_page_indirect_long_indexed_y = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=4;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        bank_byte = cpu.mmu.read_byte(memory_location+2),
        absolute_location = cpu.mmu.read_word(memory_location) + cpu.r.y;
    if(absolute_location >> 16) {
      absolute_location &= 0xffff;
      bank_byte++;
    }
    if(cpu.p.e||cpu.p.m) {
      CMP_const.execute(cpu, [cpu.mmu.read_byte_long(absolute_location,
                                                     bank_byte)]);
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
    cpu.cycle_count+=3;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        original_location = cpu.mmu.read_word(memory_location),
        absolute_location = original_location + cpu.r.y;

    if((original_location&0xff00)!==(absolute_location&0xff00))
      cpu.cycle_count++;

    if(cpu.p.e||cpu.p.m) {
      CMP_const.execute(cpu, [cpu.mmu.read_byte(absolute_location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(absolute_location),
          high_byte = cpu.mmu.read_byte(absolute_location+1);
      CMP_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var CMP_absolute = new cpu_lib.addressing.Absolute(CMP_const);

var CMP_absolute_long = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=3;

    var memory_location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.e||cpu.p.m) {
      CMP_const.execute(cpu, [cpu.mmu.read_byte_long(memory_location,
                                                     bytes[2])]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(memory_location, bytes[2]),
          high_byte = cpu.mmu.read_byte_long(memory_location+1, bytes[2]);
      CMP_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var CMP_absolute_long_indexed_x = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=5;

    var memory_location = ((bytes[1]<<8)|bytes[0]) + cpu.r.x;
    if(memory_location & 0x10000) {
      bytes[2]++;
      memory_location &= 0xffff;
    }

    if(cpu.p.e||cpu.p.m) {
      CMP_const.execute(cpu, [cpu.mmu.read_byte_long(memory_location, bytes[2])]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(memory_location, bytes[2]);
      memory_location++;
      if(memory_location & 0x10000) {
        bytes[2]++;
        memory_location &= 0xffff;
      }
      var high_byte = cpu.mmu.read_byte_long(memory_location, bytes[2]);
      CMP_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var CMP_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var original_location = (bytes[1]<<8)|bytes[0],
        memory_location = original_location+cpu.r.x;

    if((original_location&0xff00)!==(memory_location&0xff00))
      cpu.cycle_count++;

    CMP_absolute.execute(cpu, [memory_location&0x00ff, memory_location>>8]);
  }
};

var CMP_absolute_indexed_y = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var original_location = (bytes[1]<<8)|bytes[0],
        memory_location = original_location+cpu.r.y;

    if((original_location&0xff00)!==(memory_location&0xff00))
      cpu.cycle_count++;

    CMP_absolute.execute(cpu, [memory_location&0x00ff, memory_location>>8]);
  }
};

var CMP_stack_relative = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cyle_count+=2;

    if(cpu.p.e) {
      var memory_location = 0x100 | ((cpu.r.s + bytes[0]) & 0xff);
      CMP_const.execute(cpu, [cpu.mmu.read_byte(memory_location)]);
    } else {
      if(cpu.p.m) {
        CMP_const.execute(cpu, [cpu.mmu.read_byte(cpu.r.s+bytes[0])]);
      } else {
        var memory_location = cpu.r.s + bytes[0],
            low_byte = cpu.mmu.read_byte(memory_location),
            high_byte = cpu.mmu.read_byte(memory_location+1);
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
    cpu.cycle_count+=5;

    if(cpu.p.e) {
      var location_loc = 0x100 | ((cpu.r.s + bytes[0]) & 0xff),
          low_byte =  cpu.mmu.read_byte(location_loc),
          high_byte;
      if(location_loc===0x1ff) {
        high_byte = cpu.mmu.read_byte(0x100);
      } else {
        high_byte = cpu.mmu.read_byte(location_loc+1);
      }
      var absolute_location = ((high_byte<<8)|low_byte)+cpu.r.y;
      var b;
      if(absolute_location>=0x10000) {
        b = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
      } else {
        b = cpu.mmu.read_byte(absolute_location);
      }
      CMP_const.execute(cpu, [b]);
    } else {
      var location_loc = cpu.r.s + bytes[0],
          absolute_location = cpu.mmu.read_word(location_loc) + cpu.r.y;
      if(cpu.p.m) {
        var b;
        if(absolute_location>=0x10000) {
          b = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
        } else {
          b = cpu.mmu.read_byte(absolute_location);
        }
        CMP_const.execute(cpu, [b]);
      } else {
        var low_byte, high_byte;
        if(absolute_location>=0x10000) {
          low_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
          high_byte = cpu.mmu.read_byte_long(absolute_location+1, cpu.r.dbr+1);
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
    if(cpu.p.e||cpu.p.m) {
      return 2;
    } else {
      return 3;
    }
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=2;

    var old_a = cpu.r.a,
        temp = 0;
    if(cpu.p.c===0)
      temp = 1;

    if(cpu.p.e||cpu.p.m) {
      if(cpu.p.d) {
         // Form a decimal number out of a.
        var ones = cpu.r.a & 0x0f,
            tens = cpu.r.a >> 4,
            dec_a = (tens*10)+ones;

        // Form a decimal number out of the argument.
        ones = bytes[0] & 0x0f;
        tens = bytes[0] >> 4;
        var result = dec_a - ((tens*10)+ones) - temp;

        // Check for decimal overflow.
        if(result<0) {
          result += 100;
          cpu.p.c = 0;
        } else {
          cpu.p.c = 1;
        }
        var digits = result.toString(10).split(""),
            i;
        cpu.r.a = 0;
        for(i=0;i<digits.length;i++) {
          cpu.r.a += (digits[i]-0)*Math.pow(16,digits.length-i-1);
        }
      } else {
        cpu.r.a -= bytes[0] - temp;
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
      }
    } else {
      cpu.cycle_count++;

      var argument = (bytes[1]<<8)|bytes[0];
      temp = 0;

      if(cpu.p.c===0)
        temp = 1;

      if(cpu.p.d) {
        // Form a decimal number out of a.
        var ones = cpu.r.a & 0xf,
            tens = (cpu.r.a >>4) & 0xf,
            hundreds = (cpu.r.a >> 8) & 0xf,
            thousands = (cpu.r.a >> 12) & 0xf,
            dec_a = (thousands*1000)+(hundreds*100)+(tens*10)+ones;

        // Form a decimal number out of the argument.
        ones = argument & 0xf;
        tens = (argument >> 4) & 0xf;
        hundreds = (argument >> 8) & 0xf;
        thousands = (argument >> 12) & 0xf;
        var dec_arg = (thousands*1000)+(hundreds*100)+(tens*10)+ones,
            result = dec_a - dec_arg - temp;
        // Check for decimal overflow.
        if(result<0) {
          result += 10000;
          cpu.p.c = 0;
        } else {
          cpu.p.c = 1;
        }
        var digits = result.toString(10).split(""),
            i;
        cpu.r.a = 0;
        for(i=0;i<digits.length;i++) {
          cpu.r.a += (digits[i]-0)*Math.pow(16,digits.length-i-1);
        }
      } else {
        cpu.r.a -= argument - temp;
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
    }

    cpu_lib.r.p.check_z(cpu, cpu.r.a);
  }
};

var SBC_direct_page = new cpu_lib.addressing.Direct_page(SBC_const);

var SBC_absolute = new cpu_lib.addressing.Absolute(SBC_const);

var SBC_absolute_long = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=3;

    var memory_location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.e||cpu.p.m) {
      SBC_const.execute(cpu, [cpu.mmu.read_byte_long(memory_location, bytes[2])]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(memory_location, bytes[2]),
          high_byte = cpu.mmu.read_byte_long(memory_location+1, bytes[2]);
      SBC_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var SBC_absolute_long_indexed_x = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    cpu.cyle_count+=3;

    var memory_location = ((bytes[1]<<8)|bytes[0]) + cpu.r.x;
    if(memory_location & 0x10000) {
      bytes[2]++;
      memory_location &= 0xffff;
    }

    if(cpu.p.e||cpu.p.m) {
      SBC_const.execute(cpu, [cpu.mmu.read_byte_long(memory_location, bytes[2])]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(memory_location, bytes[2]);
      memory_location++;
      if(memory_location & 0x10000) {
        bytes[2]++;
      }
      var high_byte = cpu.mmu.read_byte_long(memory_location, bytes[2]);
      SBC_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var SBC_direct_page_indexed_x_indirect = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=4;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    if(cpu.p.e) {
      var memory_location = (bytes[0] + cpu.r.x) & 0xff,
          low_byte_loc = cpu.mmu.read_byte_long(memory_location+cpu.r.d, 0),
          high_byte_read_loc = ((memory_location+1)&0xff)+cpu.r.d,
          high_byte_loc = cpu.mmu.read_byte_long(high_byte_read_loc, 0);
      SBC_const.execute(cpu, [cpu.mmu.read_byte((high_byte_loc<<8) |
                                                 low_byte_loc)]);
    } else if(cpu.p.m) {
      var memory_location = bytes[0] + cpu.r.d + cpu.r.x,
          low_byte_loc = cpu.mmu.read_byte(memory_location),
          high_byte_loc = cpu.mmu.read_byte(memory_location+1);
      SBC_const.execute(cpu, [cpu.mmu.read_byte((high_byte_loc<<8) |
                                                 low_byte_loc)]);
    } else {
      var memory_location = bytes[0] + cpu.r.d + cpu.r.x,
          absolute_location = cpu.mmu.read_word(memory_location),
          low_byte = cpu.mmu.read_byte(absolute_location),
          high_byte;
      absolute_location++;
      if(absolute_location&0x10000) {
        high_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
      } else {
        high_byte = cpu.mmu.read_byte(absolute_location);
      }
      SBC_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var SBC_direct_page_indirect_long = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=4;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        bank_byte = cpu.mmu.read_byte(memory_location+2),
        absolute_location = cpu.mmu.read_word(memory_location);
    if(cpu.p.e||cpu.p.m) {
      SBC_const.execute(cpu, [cpu.mmu.read_byte_long(absolute_location,
                                                     bank_byte)]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte),
          high_byte = cpu.mmu.read_byte_long(absolute_location+1, bank_byte);
      SBC_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var SBC_direct_page_indirect_long_indexed_y = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=4;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        bank_byte = cpu.mmu.read_byte(memory_location+2),
        absolute_location = cpu.mmu.read_word(memory_location) + cpu.r.y;
    if(absolute_location >> 16) {
      absolute_location &= 0xffff;
      bank_byte++;
    }
    if(cpu.p.e||cpu.p.m) {
      SBC_const.execute(cpu, [cpu.mmu.read_byte_long(absolute_location,
                                                     bank_byte)]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte);
      absolute_location++;
      if(absolute_location >> 16) {
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
    cpu.cycle_count+=3;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        original_location = cpu.mmu.read_word(memory_location),
        absolute_location = original_location + cpu.r.y;

    if((original_location&0xff00)!==(absolute_location&0xff00))
      cpu.cycle_count++;

    if(cpu.p.e||cpu.p.m) {
      SBC_const.execute(cpu, [cpu.mmu.read_byte(absolute_location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(absolute_location),
          high_byte = cpu.mmu.read_byte(absolute_location+1);
      SBC_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var SBC_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var original_location = (bytes[1]<<8)|bytes[0],
        memory_location = original_location+cpu.r.x;

    if((original_location&0xff00)!==(memory_location&0xff00))
      cpu.cycle_count++;

    SBC_absolute.execute(cpu, [memory_location&0x00ff, memory_location>>8]);
  }
};

var SBC_absolute_indexed_y = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var original_location = (bytes[1]<<8)|bytes[0];
    var memory_location = original_location+cpu.r.y;

    if((original_location&0xff00)!==(memory_location&0xff00))
      cpu.cycle_count++;

    SBC_absolute.execute(cpu, [memory_location&0x00ff, memory_location>>8]);
  }
};

var SBC_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count++;

    SBC_direct_page.execute(cpu, [bytes[0]+cpu.r.x]);
  }
};

var SBC_direct_page_indirect = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=3;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        absolute_location = cpu.mmu.read_word(memory_location);
    if(cpu.p.e||cpu.p.m) {
      SBC_const.execute(cpu, [cpu.mmu.read_byte(absolute_location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(absolute_location),
          high_byte = cpu.mmu.read_byte(absolute_location+1);
      SBC_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var SBC_stack_relative = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=2;

    if(cpu.p.e) {
      var memory_location = 0x100 | ((cpu.r.s + bytes[0]) & 0xff);
      SBC_const.execute(cpu, [cpu.mmu.read_byte(memory_location)]);
    } else {
      if(cpu.p.m) {
        SBC_const.execute(cpu, [cpu.mmu.read_byte(cpu.r.s+bytes[0])]);
      } else {
        var memory_location = cpu.r.s + bytes[0],
            low_byte = cpu.mmu.read_byte(memory_location),
            high_byte = cpu.mmu.read_byte(memory_location+1);
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
    cpu.cycle_count+=5;

    if(cpu.p.e) {
      var location_loc = 0x100 | ((cpu.r.s + bytes[0]) & 0xff),
          low_byte =  cpu.mmu.read_byte(location_loc),
          high_byte;
      if(location_loc===0x1ff) {
        high_byte = cpu.mmu.read_byte(0x100);
      } else {
        high_byte = cpu.mmu.read_byte(location_loc+1);
      }
      var absolute_location = ((high_byte<<8)|low_byte)+cpu.r.y,
          b;
      if(absolute_location>=0x10000) {
        b = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
      } else {
        b = cpu.mmu.read_byte(absolute_location);
      }
      SBC_const.execute(cpu, [b]);
    } else {
      var location_loc = cpu.r.s + bytes[0],
          absolute_location = cpu.mmu.read_word(location_loc) + cpu.r.y;
      if(cpu.p.m) {
        var b;
        if(absolute_location>=0x10000) {
          b = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
        } else {
          b = cpu.mmu.read_byte(absolute_location);
        }
        SBC_const.execute(cpu, [b]);
      } else {
        var low_byte, high_byte;
        if(absolute_location>=0x10000) {
          low_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
          high_byte = cpu.mmu.read_byte_long(absolute_location+1, cpu.r.dbr+1);
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
    if(cpu.p.e||cpu.p.m) {
      return 2;
    } else {
      return 3;
    }
  },
  execute:function(cpu, bytes) {
    var old_a = cpu.r.a;
    if(cpu.p.e||cpu.p.m) {
      cpu.cycle_count+=2;

      if(cpu.p.d) {
        // Form a decimal number out of a.
        var ones = cpu.r.a & 0x0f,
            tens = cpu.r.a >>4,
            dec_a = (tens*10)+ones;

        // Form a decimal number out of the argument.
        ones = bytes[0] & 0x0f;
        tens = bytes[0] >>4;
        var result = dec_a + ((tens*10)+ones) + cpu.p.c;
        // Check for decimal overflow.
        if(result>99) {
          result -= 99;
          cpu.p.c = 1;
        } else {
          cpu.p.c = 0;
        }
        var digits = result.toString(10).split(""),
            i;
        cpu.r.a = 0;
        for(i=0;i<digits.length;i++) {
          cpu.r.a += (digits[i]-0)*Math.pow(16,digits.length-i-1);
        }
      } else {
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
      }
    } else {
      cpu.cycle_count+=3;
      var argument = (bytes[1]<<8)|bytes[0];
      if(cpu.p.d) {
        // Form a decimal number out of a.
        var ones = cpu.r.a & 0xf,
            tens = (cpu.r.a >>4) & 0xf,
            hundreds = (cpu.r.a >> 8) & 0xf,
            thousands = (cpu.r.a >> 12) & 0xf,
            dec_a = (thousands*1000)+(hundreds*100)+(tens*10)+ones;

        // Form a decimal number out of the argument.
        ones = argument & 0xf;
        tens = (argument >> 4) & 0xf;
        hundreds = (argument >> 8) & 0xf;
        thousands = (argument >> 12) & 0xf;
        var dec_arg = (thousands*1000)+(hundreds*100)+(tens*10)+ones,
            result = dec_a + dec_arg + cpu.p.c;
        // Check for decimal overflow.
        if(result>9999) {
          result -= 9999;
          cpu.p.c = 1;
        } else {
          cpu.p.c = 0;
        }
        var digits = result.toString(10).split(""),
            i;
        cpu.r.a = 0;
        for(i=0;i<digits.length;i++) {
          cpu.r.a += (digits[i]-0)*Math.pow(16,digits.length-i-1);
        }
      } else {
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
    }

    cpu_lib.r.p.check_z(cpu, cpu.r.a);
  }
};

var ADC_absolute = new cpu_lib.addressing.Absolute(ADC_const);

var ADC_absolute_long = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    var memory_location = (bytes[1]<<8)|bytes[0];
    cpu.cycle_count+=3;
    if(cpu.p.e||cpu.p.m) {
      ADC_const.execute(cpu, [cpu.mmu.read_byte_long(memory_location, bytes[2])]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(memory_location, bytes[2]),
          high_byte = cpu.mmu.read_byte_long(memory_location+1, bytes[2]);
      ADC_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var ADC_absolute_long_indexed_x = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=3;

    var memory_location = ((bytes[1]<<8)|bytes[0]) + cpu.r.x;
    if(memory_location & 0x10000) {
      bytes[2]++;
      memory_location &= 0xffff;
    }

    if(cpu.p.e||cpu.p.m) {
      ADC_const.execute(cpu, [cpu.mmu.read_byte_long(memory_location, bytes[2])]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(memory_location, bytes[2]);
      memory_location++;
      if(memory_location & 0x10000) {
        bytes[2]++;
      }
      var high_byte = cpu.mmu.read_byte_long(memory_location, bytes[2]);
      ADC_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var ADC_direct_page = new cpu_lib.addressing.Direct_page(ADC_const);

var ADC_direct_page_indirect = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if((cpu.r.d&0x00ff)!==0)
      cpu.cycle_count+=4;
    else
      cpu.cycle_count+=3;

    var memory_location = bytes[0] + cpu.r.d,
        absolute_location = cpu.mmu.read_word(memory_location);
    if(cpu.p.e||cpu.p.m) {
      ADC_const.execute(cpu, [cpu.mmu.read_byte(absolute_location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(absolute_location),
          high_byte = cpu.mmu.read_byte(absolute_location+1);
      ADC_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var ADC_direct_page_indexed_x_indirect = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if((cpu.r.d&0x00ff)!==0)
      cpu.cycle_count+=5;
    else
      cpu.cycle_count+=4;

    if(cpu.p.e) {
      var memory_location = (bytes[0] + cpu.r.x) & 0xff,
          low_byte_loc = cpu.mmu.read_byte_long(memory_location+cpu.r.d, 0),
          high_byte_read_loc = ((memory_location+1)&0xff)+cpu.r.d,
          high_byte_loc = cpu.mmu.read_byte_long(high_byte_read_loc, 0);
      ADC_const.execute(cpu, [cpu.mmu.read_byte((high_byte_loc<<8) |
                                                low_byte_loc)]);
    } else if(cpu.p.m) {
      var memory_location = bytes[0] + cpu.r.d + cpu.r.x,
          low_byte_loc = cpu.mmu.read_byte(memory_location),
          high_byte_loc = cpu.mmu.read_byte(memory_location+1);
      ADC_const.execute(cpu, [cpu.mmu.read_byte((high_byte_loc<<8) |
                                                low_byte_loc)]);
    } else {
      var memory_location = bytes[0] + cpu.r.d + cpu.r.x,
          absolute_location = cpu.mmu.read_word(memory_location),
          low_byte = cpu.mmu.read_byte(absolute_location),
          high_byte;
      absolute_location++;
      if(absolute_location&0x10000) {
        high_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
      } else {
        high_byte = cpu.mmu.read_byte(absolute_location);
      }
      ADC_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var ADC_direct_page_indirect_long_indexed_y = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if((cpu.r.d&0x00ff)!==0)
      cpu.cycle_count+=5;
    else
      cpu.cycle_count+=4;

    var memory_location = bytes[0] + cpu.r.d,
        bank_byte = cpu.mmu.read_byte(memory_location+2),
        absolute_location = cpu.mmu.read_word(memory_location) + cpu.r.y;

    if(absolute_location >> 16) {
      bank_byte++;
    }
    if(cpu.p.e||cpu.p.m) {
      ADC_const.execute(cpu, [cpu.mmu.read_byte_long(absolute_location,
                                                     bank_byte)]);
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
    if((cpu.r.d&0x00ff)!==0)
      cpu.cycle_count+=5;
    else
      cpu.cycle_count+=4;

    var memory_location = bytes[0] + cpu.r.d,
        bank_byte = cpu.mmu.read_byte(memory_location+2),
        absolute_location = cpu.mmu.read_word(memory_location);
    if(cpu.p.e||cpu.p.m) {
      ADC_const.execute(cpu, [cpu.mmu.read_byte_long(absolute_location,
                                                     bank_byte)]);
    } else {
      var low_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte),
          high_byte = cpu.mmu.read_byte_long(absolute_location+1, bank_byte);
      ADC_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var ADC_direct_page_indirect_indexed_y = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    if((cpu.r.d&0x00ff)!==0)
      cpu.cycle_count+=4;
    else
      cpu.cycle_count+=3;

    var memory_location = bytes[0] + cpu.r.d,
        initial_absolute_location = cpu.mmu.read_word(memory_location),
        absolute_location = initial_absolute_location + cpu.r.y;

    // Add 1 cycle if page boundary crossed
    if((initial_absolute_location&0xff00)!==(absolute_location&0xff00))
      cpu.cycle_count++;

    if(cpu.p.e||cpu.p.m) {
      ADC_const.execute(cpu, [cpu.mmu.read_byte(absolute_location)]);
    } else {
      var low_byte = cpu.mmu.read_byte(absolute_location),
          high_byte = cpu.mmu.read_byte(absolute_location+1);
      ADC_const.execute(cpu, [low_byte, high_byte]);
    }
  }
};

var ADC_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=2;

    var initial_location = (bytes[1]<<8)|bytes[0],
        memory_location = initial_location+cpu.r.x;

    // Add 1 cycle if page boundary crossed
    if((memory_location&0xff00)!==(initial_location&0xff00))
      cpu.cycle_count++;

    ADC_absolute.execute(cpu, [memory_location&0x00ff, memory_location>>8]);
  }
};

var ADC_absolute_indexed_y = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    var initial_location = (bytes[1]<<8)|bytes[0],
        memory_location = initial_location+cpu.r.y;

    // Add 1 cycle if page boundary crossed
    if((memory_location&0xff00)!==(initial_location&0xff00))
      cpu.cycle_count+=3;
    else
      cpu.cycle_count+=2;

    ADC_absolute.execute(cpu, [memory_location & 0x00ff,
                               memory_location >> 8]);
  }
};

var ADC_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count++;
    ADC_direct_page.execute(cpu, [bytes[0]+cpu.r.x]);
  }
};

var ADC_stack_relative = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=2;

    if(cpu.p.e) {
      var memory_location = 0x100 | ((cpu.r.s + bytes[0]) & 0xff);
      ADC_const.execute(cpu, [cpu.mmu.read_byte(memory_location)]);
    } else {
      if(cpu.p.m) {
        ADC_const.execute(cpu, [cpu.mmu.read_byte(cpu.r.s+bytes[0])]);
      } else {
        var memory_location = cpu.r.s + bytes[0],
            low_byte = cpu.mmu.read_byte(memory_location),
            high_byte = cpu.mmu.read_byte(memory_location+1);
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
    cpu.cycle_count+=5;

    if(cpu.p.e) {
      var location_loc = 0x100 | ((cpu.r.s + bytes[0]) & 0xff),
          low_byte =  cpu.mmu.read_byte(location_loc),
          high_byte;
      if(location_loc===0x1ff) {
        high_byte = cpu.mmu.read_byte(0x100);
      } else {
        high_byte = cpu.mmu.read_byte(location_loc+1);
      }
      var absolute_location = ((high_byte<<8)|low_byte)+cpu.r.y,
          b;
      if(absolute_location>=0x10000) {
        b = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
      } else {
        b = cpu.mmu.read_byte(absolute_location);
      }
      ADC_const.execute(cpu, [b]);
    } else {
      var location_loc = cpu.r.s + bytes[0],
          absolute_location = cpu.mmu.read_word(location_loc)+cpu.r.y;
      if(cpu.p.m) {
        var b;
        if(absolute_location>=0x10000) {
          b = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
        } else {
          b = cpu.mmu.read_byte(absolute_location);
        }
        ADC_const.execute(cpu, [b]);
      } else {
        var low_byte, high_byte;
        if(absolute_location>=0x10000) {
          low_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
          high_byte = cpu.mmu.read_byte_long(absolute_location+1, cpu.r.dbr+1);
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
    cpu.cycle_count+=2;

    if(cpu.p.e)
      cpu.cycle_count++;

    if(cpu.p.n) {
      cpu.cycle_count++;

      // Handle single byte two's complement numbers as the branch argument.
      if(bytes[0]<=127) {
        cpu.r.pc+=bytes[0];
        cpu.r.pc&=0xffff;
      } else {
        cpu.r.pc-=256-bytes[0];
        if(cpu.r.pc<0)
          cpu.r.pc+=0xffff;
      }
    }
  }
};

var BPL = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=2;

    if(cpu.p.e)
      cpu.cycle_count++;

    if(!cpu.p.n) {
      cpu.cycle_count++;

      // Handle single byte two's complement numbers as the branch argument.
      if(bytes[0]<=127) {
        cpu.r.pc+=bytes[0];
        cpu.r.pc&=0xffff;
      } else {
        cpu.r.pc-=256-bytes[0];
        if(cpu.r.pc<0)
          cpu.r.pc+=0xffff;
      }
    }
  }
};

var BVC = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=2;

    if(cpu.p.e)
      cpu.cycle_count++;

    if(!cpu.p.v) {
      cpu.cycle_count++;

      // Handle single byte two's complement numbers as the branch argument.
      if(bytes[0]<=127) {
        cpu.r.pc+=bytes[0];
        cpu.r.pc&=0xffff;
      } else {
        cpu.r.pc-=256-bytes[0];
        if(cpu.r.pc<0)
          cpu.r.pc+=0xffff;
      }
    }
  }
};


var BVS = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=2;

    if(cpu.p.e)
      cpu.cycle_count++;

    if(cpu.p.v) {
      cpu.cycle_count++;

      // Handle single byte two's complement numbers as the branch argument.
      if(bytes[0]<=127) {
        cpu.r.pc+=bytes[0];
        cpu.r.pc&=0xffff;
      } else {
        cpu.r.pc-=256-bytes[0];
        if(cpu.r.pc<0)
          cpu.r.pc+=0xffff;
      }
    }
  }
};

var BCC = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=2;

    if(cpu.p.e)
      cpu.cycle_count++;

    if(!cpu.p.c) {
      cpu.cycle_count++;

      // Handle single byte two's complement numbers as the branch argument.
      if(bytes[0]<=127) {
        cpu.r.pc+=bytes[0];
        cpu.r.pc&=0xffff;
      } else {
        cpu.r.pc-=256-bytes[0];
        if(cpu.r.pc<0)
          cpu.r.pc+=0xffff;
      }
    }
  }
};

var BCS = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=2;

    if(cpu.p.e)
      cpu.cycle_count++;

    if(cpu.p.c) {
      cpu.cycle_count++;

      // Handle single byte two's complement numbers as the branch argument.
      if(bytes[0]<=127) {
        cpu.r.pc+=bytes[0];
        cpu.r.pc&=0xffff;
      } else {
        cpu.r.pc-=256-bytes[0];
        if(cpu.r.pc<0)
          cpu.r.pc+=0xffff;
      }
    }
  }
};

var BEQ = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=2;

    if(cpu.p.e)
      cpu.cycle_count++;

    if(cpu.p.z) {
      cpu.cycle_count++;

      // Handle single byte two's complement numbers as the branch argument.
      if(bytes[0]<=127) {
        cpu.r.pc+=bytes[0];
        cpu.r.pc&=0xffff;
      } else {
        cpu.r.pc-=256-bytes[0];
        if(cpu.r.pc<0)
          cpu.r.pc+=0xffff;
      }
    }
  }
};

var BNE = {
   bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=2;

    if(cpu.p.e)
      cpu.cycle_count++;

    if(!cpu.p.z) {
      cpu.cycle_count++;

      // Handle single byte two's complement numbers as the branch argument.
      if(bytes[0]<=127) {
        cpu.r.pc+=bytes[0];
        cpu.r.pc&=0xffff;
      } else {
        cpu.r.pc-=256-bytes[0];
        if(cpu.r.pc<0)
          cpu.r.pc+=0xffff;
      }
    }
  }

};

var BRA = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=3;
    if(cpu.p.e)
      cpu.cycle_count++;

    // Handle single byte two's complement numbers as the branch argument.
    if(bytes[0]<=127) {
      cpu.r.pc+=bytes[0];
      cpu.r.pc&=0xffff;
    } else {
      cpu.r.pc-=256-bytes[0];
      if(cpu.r.pc<0)
        cpu.r.pc+=0xffff;
    }
  }
};

var BRL = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=4;

    // Handle double byte two's complement numbers as the branch argument.
    var num = (bytes[1]<<8)|bytes[0];
    if(num<=32767) {
      cpu.r.pc+=num;
      cpu.r.pc&=0xffff;
    } else {
      cpu.r.pc-=65536-num;
      if(cpu.r.pc<0)
        cpu.r.pc+=0xffff;
    }
  }
};


var JMP_absolute_indirect = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=5;

    cpu.r.pc = cpu.mmu.read_word((bytes[1]<<8)|bytes[0]);
  }
};

var JMP_absolute_long = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=4;

    cpu.r.k = bytes[2];
    cpu.r.pc = (bytes[1]<<8)|bytes[0];
  }
};

var JMP_absolute_indirect_long = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=6;

    var memory_location = (bytes[1]<<8)|bytes[0];
    cpu.r.pc = cpu.mmu.read_word(memory_location);
    cpu.r.k = cpu.mmu.read_byte(memory_location+2);
  }
};

var JMP_absolute_indexed_x_indirect = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=6;

    var memory_location = ((bytes[1]<<8)|bytes[0])+cpu.r.x,
        bank = cpu.r.k;
    if(memory_location&0x10000) {
       bank++;
    }
    memory_location &= 0xffff;
    var indirect_location = cpu.mmu.read_word_long(memory_location, bank),
        low_byte = cpu.mmu.read_byte(indirect_location);
    bank = cpu.r.k;
    if(indirect_location===0xffff) {
      indirect_location = 0;
      bank++;
    } else {
      indirect_location++;
    }
    var high_byte = cpu.mmu.read_byte_long(indirect_location, bank);
    cpu.r.pc =  (high_byte<<8)|low_byte;
  }
};

var JMP_absolute = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=3;

    cpu.r.pc = (bytes[1]<<8)|bytes[0];
  }
};

var TYA = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=2;
    if(cpu.p.e||cpu.p.m) {
      if(cpu.p.e||cpu.p.x) {
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
    cpu_lib.r.p.check_z(cpu, cpu.r.a);
  }
};

var TAY = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=2;
    if(cpu.p.e||cpu.p.m) {
      if(cpu.p.e||cpu.p.x) {
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

    cpu_lib.r.p.check_z(cpu, cpu.r.y);
  }
};


var TXA = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=2;
    if(cpu.p.e||cpu.p.m) {
      if(cpu.p.e||cpu.p.x) {
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
    cpu_lib.r.p.check_z(cpu, cpu.r.a);
  }
};

var TAX = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=2;
    if(cpu.p.e||cpu.p.m) {
      if(cpu.p.e||cpu.p.x) {
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
    cpu_lib.r.p.check_z(cpu, cpu.r.x);
  }
};

var TXY = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=2;
    cpu.r.y = cpu.r.x;
    cpu_lib.r.p.check_z(cpu, cpu.r.y);

    if(cpu.p.e||cpu.p.x) {
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
    cpu.cycle_count+=2;
    cpu.r.x = cpu.r.y;
    cpu_lib.r.p.check_z(cpu, cpu.r.x);

    if(cpu.p.e||cpu.p.x) {
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
    cpu.cycle_count+=2;

    // Transfers 16-bits regardless of setting.
    if(cpu.p.e||cpu.p.m) {
      cpu.r.d = (cpu.r.b<<8)|cpu.r.a;
    } else {
      cpu.r.d = cpu.r.a;
    }

    cpu.p.n = cpu.r.d >> 15;

    cpu_lib.r.p.check_z(cpu, cpu.r.d);
  }
};

var TDC = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=2;

    // Transfers 16-bits regardless of setting.
    if(cpu.p.e||cpu.p.m) {
      cpu.r.a = cpu.r.d & 0xff;
      cpu.r.b = cpu.r.d >> 8;
      cpu.p.n = cpu.r.b >> 7;
    } else {
      cpu.r.a = cpu.r.d;
      cpu.p.n = cpu.r.a >> 7;
    }

    cpu_lib.r.p.check_z(cpu, cpu.r.a);
  }
};

var TCS = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=2;

    if(cpu.p.e||!cpu.p.m) {
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
    cpu.cycle_count+=2;

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

      cpu_lib.r.p.check_z(cpu, cpu.r.s);
    }
  }
};

var STZ_absolute = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=4;

    var memory_location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.e||cpu.p.m) {
      cpu.mmu.store_byte(memory_location, 0);
    } else {
      cpu.cycle_count++;

      cpu.mmu.store_word(memory_location, 0);
    }
  }
};

var STZ_direct_page = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=3;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0]+cpu.r.d;
    if(cpu.p.e||cpu.p.m) {
      cpu.mmu.store_byte(memory_location, 0);
    } else {
      cpu.cycle_count++;

      cpu.mmu.store_word(memory_location, 0);
    }
  }
};

var STZ_absolute_indexed_x = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=5;

    var memory_location = ((bytes[1]<<8)|bytes[0])+cpu.r.x;
    if(cpu.p.e||cpu.p.m) {
      cpu.mmu.store_byte(memory_location, 0);
    } else {
      cpu.cycle_count++;

      cpu.mmu.store_word(memory_location, 0);
    }
  }
};

var STZ_direct_page_indexed_x = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=4;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0]+cpu.r.d+cpu.r.x;
    if(cpu.p.e||cpu.p.m) {
      cpu.mmu.store_byte(memory_location, 0);
    } else {
      cpu.cycle_count++;

      // Check for overflow.
      var overflow_check = memory_location - 0xffff;
      if(overflow_check > 0) {
        memory_location = overflow_check-1;
      }
      cpu.mmu.store_byte(memory_location, 0);
      // Check for potential overflow again.
      if(memory_location===0xffff) {
       memory_location = 0;
      } else {
        memory_location++;
      }
      cpu.mmu.store_byte(memory_location, 0);
    }
  }
};

var STA_direct_page_indirect = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=5;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        absolute_location = cpu.mmu.read_word(memory_location);
    if(cpu.p.e||cpu.p.m) {
      cpu.mmu.store_byte(absolute_location, cpu.r.a);
    } else {
      cpu.cycle_count++;

      cpu.mmu.store_word(absolute_location, cpu.r.a);
    }
  }
};

var STA_direct_page_indirect_long = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=6;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        absolute_location = cpu.mmu.read_word(memory_location),
        bank_byte = cpu.mmu.read_byte(memory_location+2);
    if(cpu.p.e||cpu.p.m) {
      cpu.mmu.store_byte_long(absolute_location, bank_byte,
                              cpu.r.a);
    } else {
      cpu.cycle_count++;

      cpu.mmu.store_word_long(absolute_location, bank_byte, cpu.r.a);
    }
  }
};

var STA_direct_page_indirect_long_indexed_y = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=6;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        bank_byte = cpu.mmu.read_byte(memory_location+2),
        absolute_location = cpu.mmu.read_word(memory_location) + cpu.r.y;
    if(absolute_location >> 16) {
      bank_byte++;
      absolute_location &= 0xffff;
    }
    if(cpu.p.e||cpu.p.m) {
      cpu.mmu.store_byte_long(absolute_location, bank_byte, cpu.r.a);
    } else {
      cpu.cycle_count++;

      cpu.mmu.store_byte_long(absolute_location, bank_byte, cpu.r.a&0xff);
      absolute_location++;
      if(absolute_location >> 16) {
        bank_byte++;
      }
      cpu.mmu.store_byte_long(absolute_location, bank_byte, cpu.r.a>>8);
    }
  }
};

var STA_direct_page_indirect_indexed_y = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=6;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        absolute_location = cpu.mmu.read_word(memory_location) + cpu.r.y;
    if(cpu.p.e||cpu.p.m) {
      cpu.mmu.store_byte(absolute_location, cpu.r.a);
    } else {
      cpu.cycle_count++;

      cpu.mmu.store_word(absolute_location, cpu.r.a);
    }
  }
};

var STA_stack_relative = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=4;

    if(cpu.p.e) {
      cpu.mmu.store_byte(0x100 | ((cpu.r.s + bytes[0]) & 0xff), cpu.r.a);
    } else {
      if(cpu.p.m) {
        cpu.mmu.store_byte(cpu.r.s + bytes[0], cpu.r.a);
      } else {
        cpu.cycle_count++;

        cpu.mmu.store_word(cpu.r.s + bytes[0], cpu.r.a);
      }
    }
  }
};

var STA_stack_relative_indirect_indexed_y = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=7;

    if(cpu.p.e) {
      var location_loc = 0x100 | ((cpu.r.s + bytes[0]) & 0xff),
          low_byte =  cpu.mmu.read_byte(location_loc),
          high_byte;
      if(location_loc===0x1ff) {
        high_byte = cpu.mmu.read_byte(0x100);
      } else {
        high_byte = cpu.mmu.read_byte(location_loc+1);
      }
      var absolute_location = ((high_byte<<8)|low_byte)+cpu.r.y,
          b;
      if(absolute_location>=0x10000) {
        b = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
      } else {
        b = cpu.mmu.read_byte(absolute_location);
      }
      cpu.mmu.store_byte(b, cpu.r.a);
    } else {
      var location_loc = cpu.r.s + bytes[0],
          absolute_location = cpu.mmu.read_word(location_loc)+cpu.r.y;
      if(cpu.p.m) {
        var b;
        if(absolute_location>=0x10000) {
          b = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
        } else {
          b = cpu.mmu.read_byte(absolute_location);
        }
        cpu.mmu.store_byte(b, cpu.r.a);
      } else {
        cpu.cycle_count++;

        var low_byte, high_byte;
        if(absolute_location>=0x10000) {
          low_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
          high_byte = cpu.mmu.read_byte_long(absolute_location+1, cpu.r.dbr+1);
        } else {
          low_byte = cpu.mmu.read_byte(absolute_location);
          if(absolute_location===0xffff) {
            high_byte = cpu.mmu.read_byte_long(0, cpu.r.dbr+1);
          } else {
            high_byte = cpu.mmu.read_byte(absolute_location);
          }
        }
        cpu.mmu.store_word((high_byte<<8)|low_byte, cpu.r.a);
      }
    }
  }
};

var LDA_direct_page_indirect = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=5;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        absolute_location = cpu.mmu.read_word(memory_location);
    if(cpu.p.e||cpu.p.m) {
      cpu.r.a = cpu.mmu.read_byte(absolute_location);
      cpu.p.n = cpu.r.a >> 7;
    } else {
      cpu.cycle_count++;

      cpu.r.a = cpu.mmu.read_word(absolute_location);
      cpu.p.n = cpu.r.a >> 15;
    }
    cpu_lib.r.p.check_z(cpu, cpu.r.a);
  }
};

var LDA_direct_page_indexed_x_indirect = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=6;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    if(cpu.p.e) {
      var memory_location = (bytes[0] + cpu.r.x) & 0xff,
          low_byte_loc = cpu.mmu.read_byte_long(memory_location+cpu.r.d, 0),
          high_byte_read_loc = ((memory_location+1)&0xff)+cpu.r.d,
          high_byte_loc = cpu.mmu.read_byte_long(high_byte_read_loc, 0);
      cpu.r.a = cpu.mmu.read_byte((high_byte_loc<<8) | low_byte_loc);
      cpu.p.n = cpu.r.a >> 7;
    } else if(cpu.p.m) {
      var memory_location = bytes[0] + cpu.r.d + cpu.r.x;
      cpu.r.a = cpu.mmu.read_byte(cpu.mmu.read_word(memory_location));
      cpu.p.n = cpu.r.a >> 7;
    } else {
      cpu.cycle_count++;

      var memory_location = bytes[0] + cpu.r.d + cpu.r.x,
          absolute_location = cpu.mmu.read_word(memory_location),
          low_byte = cpu.mmu.read_byte(absolute_location),
          high_byte;
      absolute_location++;
      if(absolute_location&0x10000) {
        high_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
      } else {
        high_byte = cpu.mmu.read_byte(absolute_location);
      }
      cpu.r.a = (high_byte<<8) | low_byte;
      cpu.p.n = cpu.r.a >> 15;
    }
    cpu_lib.r.p.check_z(cpu, cpu.r.a);
  }
};

var LDA_direct_page_indirect_long = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=6;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        bank_byte = cpu.mmu.read_byte(memory_location+2),
        absolute_location = cpu.mmu.read_word(memory_location);

    if(cpu.p.e||cpu.p.m) {
      cpu.r.a = cpu.mmu.read_byte_long(absolute_location,
                                       bank_byte);
      cpu.p.n = cpu.r.a >> 7;
    } else {
      cpu.cycle_count++;

      cpu.r.a = cpu.mmu.read_word_long(absolute_location, bank_byte);
      cpu.p.n = cpu.r.a >> 15;
    }
    cpu_lib.r.p.check_z(cpu, cpu.r.a);
  }
};

var LDA_direct_page_indirect_long_indexed_y = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=6;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        bank_byte = cpu.mmu.read_byte(memory_location+2),
        absolute_location = cpu.mmu.read_word(memory_location) + cpu.r.y;

    if(cpu.p.e||cpu.p.m) {
      if(absolute_location >> 16) {
        bank_byte++;
      }
      cpu.r.a = cpu.mmu.read_byte_long(absolute_location, bank_byte);
      cpu.p.n = cpu.r.a >> 7;
    } else {
      cpu.cycle_count++;

      if(absolute_location >> 16) {
        bank_byte++;
        absolute_location &= 0xffff;
      }
      var low_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte);
      absolute_location++;
      if(absolute_location >> 16) {
        bank_byte++;
      }
      var high_byte = cpu.mmu.read_byte_long(absolute_location, bank_byte);
      cpu.r.a = (high_byte<<8) | low_byte;
      cpu.p.n = cpu.r.a >> 15;
    }
    cpu_lib.r.p.check_z(cpu, cpu.r.a);
  }
};

var LDA_direct_page_indirect_indexed_y = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=5;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        original_location = cpu.mmu.read_word(memory_location),
        absolute_location = original_location + cpu.r.y;

    if((original_location&0xff00)!==(absolute_location&0xff00))
      cpu.cycle_count++;

    if(cpu.p.e||cpu.p.m) {
      cpu.r.a = cpu.mmu.read_byte(absolute_location);
      cpu.p.n = cpu.r.a >> 7;
    } else {
      cpu.cycle_count++;

      cpu.r.a = cpu.mmu.read_word(absolute_location);
      cpu.p.n = cpu.r.a >> 15;
    }
    cpu_lib.r.p.check_z(cpu, cpu.r.a);
  }
};

var LDA_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=4;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d + cpu.r.x;
    if(cpu.p.e||cpu.p.m) {
      cpu.r.a = cpu.mmu.read_byte(memory_location);
      cpu.p.n = cpu.r.a >> 7;
    } else {
      cpu.cycle_count++;

      cpu.r.a = cpu.mmu.read_word(memory_location);
      cpu.p.n = cpu.r.a >> 15;
    }
    cpu_lib.r.p.check_z(cpu, cpu.r.a);
  }
};

var LDA_absolute_indexed_y = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=4;

    var original_location = (bytes[1]<<8)|bytes[0],
        memory_location = original_location+cpu.r.y;

    if((original_location&0xff00)!==(memory_location&0xff00))
      cpu.cycle_count++;

    if(cpu.p.e||cpu.p.m) {
      cpu.r.a = cpu.mmu.read_byte(memory_location);
      cpu.p.n = cpu.r.a >> 7;
    } else {
      cpu.cycle_count++;

      cpu.r.a = cpu.mmu.read_word(memory_location);
      cpu.p.n = cpu.r.a >> 15;
    }
    cpu_lib.r.p.check_z(cpu, cpu.r.a);
  }
};

var LDA_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=4;

    var original_location = (bytes[1]<<8)|bytes[0],
        memory_location = original_location+cpu.r.x;

    if((original_location&0xff00)!==(memory_location&0xff00))
      cpu.cycle_count++;

    if(cpu.p.e||cpu.p.m) {
      cpu.r.a = cpu.mmu.read_byte(memory_location);
      cpu.p.n = cpu.r.a >> 7;
    } else {
      cpu.cycle_count++;

      cpu.r.a = cpu.mmu.read_word(memory_location);
      cpu.p.n = cpu.r.a >> 15;
    }
    cpu_lib.r.p.check_z(cpu, cpu.r.a);
  }
};

var LDA_stack_relative = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=4;

    if(cpu.p.e) {
      var memory_location = 0x100 | ((cpu.r.s + bytes[0]) & 0xff);
      LDA_const.execute(cpu, [cpu.mmu.read_byte(memory_location)]);
    } else {
      if(cpu.p.m) {
        LDA_const.execute(cpu, [cpu.mmu.read_byte(cpu.r.s+bytes[0])]);
      } else {
        cpu.cycle_count++;
        var memory_location = cpu.r.s + bytes[0],
            low_byte = cpu.mmu.read_byte(memory_location),
            high_byte = cpu.mmu.read_byte(memory_location+1);
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
    cpu.cycle_count+=7;

    if(cpu.p.e) {
      var location_loc = 0x100 | ((cpu.r.s + bytes[0]) & 0xff),
          low_byte =  cpu.mmu.read_byte(location_loc),
          high_byte;
      if(location_loc===0x1ff) {
        high_byte = cpu.mmu.read_byte(0x100);
      } else {
        high_byte = cpu.mmu.read_byte(location_loc+1);
      }
      var absolute_location = ((high_byte<<8)|low_byte)+cpu.r.y,
          b;
      if(absolute_location>=0x10000) {
        b = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
      } else {
        b = cpu.mmu.read_byte(absolute_location);
      }
      LDA_const.execute(cpu, [b]);
    } else {
      var location_loc = cpu.r.s + bytes[0],
          absolute_location = cpu.mmu.read_word(location_loc)+cpu.r.y;
      if(cpu.p.m) {
        var b;
        if(absolute_location>=0x10000) {
          b = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
        } else {
          b = cpu.mmu.read_byte(absolute_location);
        }
        LDA_const.execute(cpu, [b]);
      } else {
        cpu.cycle_count++;

        var low_byte, high_byte;
        if(absolute_location>=0x10000) {
          low_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
          high_byte = cpu.mmu.read_byte_long(absolute_location+1, cpu.r.dbr+1);
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
  execute:function(cpu) {
    cpu.cycle_count+=2;
  }
};

var LDY_const = {
  bytes_required:function(cpu) {
    if(cpu.p.e||cpu.p.x)
      return 2;
    else
      return 3;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=2;

    if(cpu.p.e||cpu.p.x) {
      cpu.r.y = bytes[0];
      cpu.p.n = cpu.r.y >> 7;
    } else {
      cpu.cycle_count++;

      cpu.r.y = (bytes[1]<<8)|bytes[0];
      cpu.p.n = cpu.r.y >> 15;
    }
    cpu_lib.r.p.check_z(cpu, cpu.r.y);
  }
};

var LDY_absolute_indexed_x = {
  bytes_required:function() {
    return 3;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=4;

    var original_location = (bytes[1]<<8)|bytes[0],
        memory_location = original_location + cpu.r.x;

    if((original_location&0xff00)!==(memory_location&0xff00))
      cpu.cycle_count++;

    if(cpu.p.e||cpu.p.x) {
      cpu.r.y = cpu.mmu.read_byte(memory_location);
      cpu.p.n = cpu.r.y >> 7;
    } else {
      cpu.cycle_count++;

      cpu.r.y = cpu.mmu.read_word(memory_location);
      cpu.p.n = cpu.r.y >> 15;
    }
    cpu_lib.r.p.check_z(cpu, cpu.r.y);
  }
};

var LDY_direct_page_indexed_x = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=4;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d + cpu.r.x;
    if(cpu.p.e||cpu.p.x) {
      cpu.r.y = cpu.mmu.read_byte(memory_location);
      cpu.p.n = cpu.r.y >> 7;
    } else {
      cpu.cycle_count++;

      cpu.r.y = cpu.mmu.read_word(memory_location);
      cpu.p.n = cpu.r.y >> 15;
    }
    cpu_lib.r.p.check_z(cpu, cpu.r.a);
  }
};

var LDY_absolute = new cpu_lib.addressing.Absolute(LDY_const);

var LDY_direct_page = new cpu_lib.addressing.Direct_page(LDY_const);

var DEX = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=2;

    if(cpu.r.x===0) {
      if(cpu.p.e||cpu.p.x) {
        cpu.r.x = 0xff;
      } else {
        cpu.r.x = 0xffff;
      }
      cpu.p.n = 1;
      cpu.p.z = 0;
    } else {
      cpu.r.x--;
      if(cpu.p.e||cpu.p.x) {
        cpu.p.n = cpu.r.x >> 7;
      } else {
        cpu.p.n = cpu.r.x >> 15;
      }

      cpu_lib.r.p.check_z(cpu, cpu.r.x);
    }
  }
};

var DEY = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=2;

    if(cpu.r.y===0) {
      if(cpu.p.e||cpu.p.x) {
        cpu.r.y = 0xff;
      } else {
        cpu.r.y = 0xffff;
      }
      cpu.p.n = 1;
      cpu.p.z = 0;
    } else {
      cpu.r.y--;

      if(cpu.p.e||cpu.p.x) {
        cpu.p.n = cpu.r.y >> 7;
      } else {
        cpu.p.n = cpu.r.y >> 15;
      }

      cpu_lib.r.p.check_z(cpu, cpu.r.y);
    }
  }
};

var DEC_accumulator = {
  bytes_required: function() {
    return 1;
  },
  execute: function(cpu) {
    cpu.cycle_count+=2;

    if(cpu.r.a===0) {
      if(cpu.p.e||cpu.p.m) {
        cpu.r.a = 0xff;
      } else {
        cpu.r.a = 0xffff;
      }
      cpu.p.n = 1;
      cpu.p.z = 0;
    } else {
      cpu.r.a--;
      if(cpu.p.e||cpu.p.m) {
        cpu.r.a &= 0xff;
        cpu.p.n = cpu.r.a >> 7;
      } else {
        cpu.r.a &= 0xffff;
        cpu.p.n = cpu.r.a >> 15;
      }

      cpu_lib.r.p.check_z(cpu, cpu.r.a);
    }
  }
};

var DEC_absolute = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=6;

    var memory_location = (bytes[1]<<8)|bytes[0],
        temp;
    if(cpu.p.e||cpu.p.m) {
      temp = cpu.mmu.read_byte(memory_location);
      if(temp===0) {
        cpu.mmu.store_byte(memory_location, 0xff);
        cpu.p.n = 1;
        cpu.p.z = 0;
      } else {
        temp--;
        cpu.mmu.store_byte(memory_location, temp);
        cpu.p.n = temp >> 7;
        cpu_lib.r.p.check_z(cpu, temp);
      }
    } else {
      cpu.cycle_count+=2;

      temp = cpu.mmu.read_word(memory_location);
      if(temp===0) {
        temp = 0xffff;
        cpu.p.n = 1;
        cpu.p.z = 0;
      } else {
        temp--;
        cpu.p.n = temp >> 15;
        cpu_lib.r.p.check_z(cpu, temp);
      }

      cpu.mmu.store_word(memory_location, temp);
    }
  }
};

var DEC_absolute_indexed_x = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=7;

    var memory_location = ((bytes[1]<<8)|bytes[0]) + cpu.r.x,
        temp;
    if(cpu.p.e||cpu.p.m) {
      temp = cpu.mmu.read_byte(memory_location);
      if(temp===0) {
        cpu.mmu.store_byte(memory_location, 0xff);
        cpu.p.n = 1;
        cpu.p.z = 0;
      } else {
        temp--;
        cpu.mmu.store_byte(memory_location, temp);
        cpu.p.n = temp >> 7;
        cpu_lib.r.p.check_z(cpu, temp);
      }
    } else {
      cpu.cycle_count+=2;

      temp = cpu.mmu.read_word(memory_location);
      if(temp===0) {
        temp = 0xffff;
        cpu.p.n = 1;
        cpu.p.z = 0;
      } else {
        temp--;
        cpu.p.n = temp >> 15;
        cpu_lib.r.p.check_z(cpu, temp);
      }

      cpu.mmu.store_word(memory_location, temp);
    }
  }
};

var DEC_direct_page = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=5;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        temp;
    if(cpu.p.e||cpu.p.m) {
      temp = cpu.mmu.read_byte(memory_location);
      if(temp===0) {
        cpu.mmu.store_byte(memory_location, 0xff);
        cpu.p.n = 1;
        cpu.p.z = 0;
      } else {
        temp--;
        cpu.mmu.store_byte(memory_location, temp);
        cpu.p.n = temp >> 7;
        cpu_lib.r.p.check_z(cpu, temp);
      }
    } else {
      cpu.cycle_count+=2;

      temp = cpu.mmu.read_word(memory_location);
      if(temp===0) {
        temp = 0xffff;
        cpu.p.n = 1;
        cpu.p.z = 0;
      } else {
        temp--;
        cpu.p.n = temp >> 15;
        cpu_lib.r.p.check_z(cpu, temp);
      }

      cpu.mmu.store_word(memory_location, temp);
    }
  }
};

var DEC_direct_page_indexed_x = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=6;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d + cpu.r.x,
        temp;
    if(cpu.p.e||cpu.p.m) {
      temp = cpu.mmu.read_byte(memory_location);
      if(temp===0) {
        cpu.mmu.store_byte(memory_location, 0xff);
        cpu.p.n = 1;
        cpu.p.z = 0;
      } else {
        temp--;
        cpu.mmu.store_byte(memory_location, temp);
        cpu.p.n = temp >> 7;
        cpu_lib.r.p.check_z(cpu, temp);
      }
    } else {
      cpu.cycle_count+=2;

      temp = cpu.mmu.read_word(memory_location);
      if(temp===0) {
        temp = 0xffff;
        cpu.p.n = 1;
        cpu.p.z = 0;
      } else {
        temp--;
        cpu.p.n = temp >> 15;
        cpu_lib.r.p.check_z(cpu, temp);
      }

      cpu.mmu.store_word(memory_location, temp);
    }
  }
};

var INX = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=2;

    cpu.r.x++;

    if(cpu.p.e||cpu.p.x) {
      cpu.r.x &= 0xff;
      cpu.p.n = cpu.r.x >> 7;
    } else {
      cpu.r.x &= 0xffff;
      cpu.p.n = cpu.r.x >> 15;
    }

    cpu_lib.r.p.check_z(cpu, cpu.r.x);
  }
};

var INY = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=2;

    cpu.r.y++;

    if(cpu.p.e||cpu.p.x) {
      cpu.r.y &= 0xff;
      cpu.p.n = cpu.r.y >> 7;
    } else {
      cpu.r.y &= 0xffff;
      cpu.p.n = cpu.r.y >> 15;
    }

    cpu_lib.r.p.check_z(cpu, cpu.r.y);
  }
};

var INC_accumulator = {
  bytes_required: function() {
    return 1;
  },
  execute: function(cpu) {
    cpu.cycle_count+=2;

    cpu.r.a++;

    if(cpu.p.e||cpu.p.m) {
      cpu.r.a &= 0xff;
      cpu.p.n = cpu.r.a >> 7;
    } else {
      cpu.r.a &= 0xffff;
      cpu.p.n = cpu.r.a >> 15;
    }

    cpu_lib.r.p.check_z(cpu, cpu.r.a);
  }
};

var INC_absolute = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=6;

    var memory_location = (bytes[1]<<8)|bytes[0],
        temp;
    if(cpu.p.e||cpu.p.m) {
      temp = (cpu.mmu.read_byte(memory_location) + 1) & 0xff;
      cpu.p.n = temp >> 7;
      cpu.mmu.store_byte(memory_location, temp);
      cpu_lib.r.p.check_z(cpu, temp);
    } else {
      cpu.cycle_count+=2;

      temp = cpu.mmu.read_word(memory_location) + 1;
      cpu.p.n = temp >> 15;
      cpu.mmu.store_word(memory_location, temp);
      cpu_lib.r.p.check_z(cpu, temp);
    }
  }
};

var INC_absolute_indexed_x = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=7;

    var memory_location = ((bytes[1]<<8)|bytes[0]) + cpu.r.x,
        temp;
    if(cpu.p.e||cpu.p.m) {
      temp = (cpu.mmu.read_byte(memory_location) + 1) & 0xff;
      cpu.p.n = temp >> 7;
      cpu.mmu.store_byte(memory_location, temp);
      cpu_lib.r.p.check_z(cpu, temp);
    } else {
      cpu.cycle_count+=2;

      temp = cpu.mmu.read_word(memory_location) + 1;
      cpu.p.n = temp >> 15;
      cpu.mmu.store_word(memory_location, temp);
      cpu_lib.r.p.check_z(cpu, temp);
    }
  }
};

var INC_direct_page = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=5;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d,
        temp;
    if(cpu.p.e||cpu.p.m) {
      temp = (cpu.mmu.read_byte(memory_location) + 1) & 0xff;
      cpu.mmu.store_byte(memory_location, temp);
      cpu.p.n = temp >> 7;
      cpu_lib.r.p.check_z(cpu, temp);
    } else {
      cpu.cycle_count+=2;

      temp = cpu.mmu.read_word(memory_location) + 1;
      cpu.p.n = temp >> 15;
      cpu.mmu.store_word(memory_location, temp);
      cpu_lib.r.p.check_z(cpu, temp);
    }
  }
};

var INC_direct_page_indexed_x = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=6;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0] + cpu.r.d + cpu.r.x,
        temp;
    if(cpu.p.e||cpu.p.m) {
      temp = (cpu.mmu.read_byte(memory_location) + 1) & 0xff;
      cpu.mmu.store_byte(memory_location, temp);
      cpu.p.n = temp >> 7;
      cpu_lib.r.p.check_z(cpu, temp);
    } else {
      cpu.cycle_count+=2;

      temp = cpu.mmu.read_word(memory_location) + 1;
      cpu.p.n = temp >> 15;
      cpu.mmu.store_word(memory_location, temp);
      cpu_lib.r.p.check_z(cpu, temp);
    }
  }
};

var STA_direct_page_indexed_x = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=4;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0]+cpu.p.d+cpu.r.x;
    if(cpu.p.e||cpu.p.m) {
      cpu.mmu.store_byte(memory_location, cpu.r.a);
    } else {
      cpu.cycle_count++;

      cpu.mmu.store_word(memory_location, cpu.r.a);
    }
  }
};

var STA_direct_page_indexed_x_indirect = {
  bytes_required:function() {
    return 2;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=6;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    if(cpu.p.e) {
      var memory_location = (bytes[0] + cpu.r.x) & 0xff,
          low_byte_loc = cpu.mmu.read_byte_long(memory_location+cpu.r.d, 0),
          high_byte_read_loc = ((memory_location+1)&0xff)+cpu.r.d,
          high_byte_loc = cpu.mmu.read_byte_long(high_byte_read_loc, 0);
      cpu.mmu.store_byte((high_byte_loc<<8) | low_byte_loc, cpu.r.a);
    } else if(cpu.p.m) {
      var memory_location = bytes[0] + cpu.r.d + cpu.r.x;
      cpu.mmu.store_byte(cpu.mmu.read_word(memory_location), cpu.r.a);
    } else {
      cpu.cycle_count++;

      var memory_location = bytes[0] + cpu.r.d + cpu.r.x,
          absolute_location = cpu.mmu.read_word(memory_location),
          low_byte = cpu.mmu.read_byte(absolute_location),
          high_byte;
      absolute_location++;
      if(absolute_location&0x10000) {
        high_byte = cpu.mmu.read_byte_long(absolute_location, cpu.r.dbr+1);
      } else {
        high_byte = cpu.mmu.read_byte(absolute_location);
      }
      var storage_location = (high_byte<<8) | low_byte;
      cpu.mmu.store_byte(storage_location, cpu.r.a & 0xff);
      storage_location++;
      if(storage_location&0x10000) {
        cpu.mmu.store_byte_long(storage_location, cpu.r.dbr+1, cpu.r.a >> 8);
      } else {
        cpu.mmu.store_byte(storage_location, cpu.r.a >> 8);
      }
    }
  }
};

var STA_direct_page = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=3;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0]+cpu.p.d;
    if(cpu.p.e||cpu.p.m) {
      cpu.mmu.store_byte(memory_location, cpu.r.a);
    } else {
      cpu.cycle_count++;

      cpu.mmu.store_word(memory_location, cpu.r.a);
    }
  }
};

var STA_absolute_indexed_x = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=5;

    var memory_location = ((bytes[1]<<8)|bytes[0])+cpu.r.x;
    if(cpu.p.e||cpu.p.m) {
      cpu.mmu.store_byte(memory_location, cpu.r.a);
    } else {
      cpu.cycle_count++;

      cpu.mmu.store_word(memory_location, cpu.r.a);
    }
  }
};

var STA_absolute_indexed_y = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=5;

    var memory_location = ((bytes[1]<<8)|bytes[0])+cpu.r.y;
    if(cpu.p.e||cpu.p.m) {
      cpu.mmu.store_byte(memory_location, cpu.r.a);
    } else {
      cpu.cycle_count++;

      cpu.mmu.store_word(memory_location, cpu.r.a);
    }
  }
};

var STY_direct_page_indexed_x = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=4;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0]+cpu.p.d+cpu.r.x;
    if(cpu.p.e||cpu.p.x) {
      cpu.mmu.store_byte(memory_location, cpu.r.y);
    } else {
      cpu.cycle_count++;

      cpu.mmu.store_word(memory_location, cpu.r.y);
    }
  }
};

var STY_direct_page = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=3;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0]+cpu.p.d;
    if(cpu.p.e||cpu.p.x) {
      cpu.mmu.store_byte(memory_location, cpu.r.y);
    } else {
      cpu.cycle_count++;

      cpu.mmu.store_word(memory_location, cpu.r.y);
    }
  }
};

var STY_absolute = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=4;

    var memory_location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.e||cpu.p.x) {
      cpu.mmu.store_byte(memory_location, cpu.r.y);
    } else {
      cpu.cycle_count++;

      cpu.mmu.store_word(memory_location, cpu.r.y);
    }
  }
};

var STX_direct_page_indexed_y = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=4;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0]+cpu.p.d+cpu.r.y;
    if(cpu.p.e||cpu.p.x) {
      cpu.mmu.store_byte(memory_location, cpu.r.x);
    } else {
      cpu.cycle_count++;

      cpu.mmu.store_word(memory_location, cpu.r.x);
    }
  }
};

var STX_direct_page = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=3;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = bytes[0]+cpu.p.d;
    if(cpu.p.e||cpu.p.x) {
      cpu.mmu.store_byte(memory_location, cpu.r.x);
    } else {
      cpu.cycle_count++;

      cpu.mmu.store_word(memory_location, cpu.r.x);
    }
  }
};

var STX_absolute = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=4;

    var memory_location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.e||cpu.p.x) {
      cpu.mmu.store_byte(memory_location, cpu.r.x);
    } else {
      cpu.cycle_count++;

      cpu.mmu.store_word(memory_location, cpu.r.x);
    }
  }
};

var STA_absolute_long = {
  bytes_required: function() {
    return 4;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=5;

    var memory_location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.e||cpu.p.m) {
      cpu.mmu.store_byte_long(memory_location, bytes[2], cpu.r.a);
    } else {
      cpu.cycle_count++;

      cpu.mmu.store_word_long(memory_location, bytes[2], cpu.r.a);
    }
  }
};

var STA_absolute_long_indexed_x = {
  bytes_required: function() {
    return 4;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=5;

    var memory_location = ((bytes[1]<<8)|bytes[0]) + cpu.r.x;
    if(memory_location & 0x10000) {
      memory_location &= 0xffff;
      bytes[2]++;
    }
    if(cpu.p.e||cpu.p.m) {
      cpu.mmu.store_byte_long(memory_location, bytes[2], cpu.r.a);
    } else {
      cpu.cycle_count++;

      cpu.mmu.store_byte_long(memory_location, bytes[2], cpu.r.a&0x00ff);
      memory_location++;
      if(memory_location & 0x10000) {
        bytes[2]++;
      }
      cpu.mmu.store_byte_long(memory_location, bytes[2], cpu.r.a>>8);
    }
  }
};

var STA_absolute = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=4;

    var memory_location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.e||cpu.p.m) {
      cpu.mmu.store_byte(memory_location, cpu.r.a);
    } else {
      cpu.cycle_count++;

      cpu.mmu.store_word(memory_location, cpu.r.a);
    }
  }
};

var LDX_direct_page_indexed_y = {
  bytes_required: function() {
    return 2;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=4;

    if((cpu.r.d&0xff)!==0)
      cpu.cycle_count++;

    var memory_location = cpu.r.d + bytes[0] + cpu.r.y;
    if(cpu.p.e||cpu.p.x) {
      cpu.r.x = cpu.mmu.read_byte(memory_location);
      cpu.p.n = cpu.r.x >> 7;
    } else {
      cpu.cycle_count++;

      cpu.r.x = cpu.mmu.read_word(memory_location);
      cpu.p.n = cpu.r.x >> 15;
    }
    cpu_lib.r.p.check_z(cpu, cpu.r.x);
  }
};

var LDA_const = {
  bytes_required: function(cpu) {
    if(cpu.p.e||cpu.p.m) {
      return 2;
    } else {
      return 3;
    }
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=2;

    if(cpu.p.e||cpu.p.m) {
      cpu.r.a = bytes[0];
      cpu.p.n = cpu.r.a >> 7;
    } else {
      cpu.cycle_count++;

      cpu.r.a = (bytes[1]<<8)|bytes[0];
      cpu.p.n = cpu.r.a >> 15;
    }
    cpu_lib.r.p.check_z(cpu, cpu.r.a);
  }
};

var LDA_direct_page = new cpu_lib.addressing.Direct_page(LDA_const);

var LDX_absolute_indexed_y = {
  bytes_required: function() {
    return 3;
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=4;

    var original_location = (bytes[1]<<8)|bytes[0],
        memory_location = original_location+cpu.r.y;

    if((original_location&0xff00)!==(memory_location&0xff00))
      cpu.cycle_count++;

    if(cpu.p.e||cpu.p.x) {
      cpu.r.x = cpu.mmu.read_byte(memory_location);
      cpu.p.n = cpu.r.x >> 7;
    } else {
      cpu.cycle_count++;

      cpu.r.x = cpu.mmu.read_word(memory_location);
      cpu.p.n = cpu.r.x >> 15;
    }
    cpu_lib.r.p.check_z(cpu, cpu.r.x);
  }
};

var LDA_absolute_long = {
  bytes_required: function() {
    return 4;
  },
  execute: function(cpu, bytes) {
    cpu.cyclce_count+=5;

    var memory_location = (bytes[1]<<8)|bytes[0];
    if(cpu.p.e||cpu.p.m) {
      cpu.r.a = cpu.mmu.read_byte_long(memory_location, bytes[2]);
      cpu.p.n = cpu.r.a >> 7;
    } else {
      cpu.cycle_count++;

      cpu.r.a = cpu.mmu.read_word_long(memory_location, bytes[2]);
      cpu.p.n = cpu.r.a >> 15;
    }
    cpu_lib.r.p.check_z(cpu, cpu.r.a);
  }
};

var LDA_absolute_long_indexed_x = {
  bytes_required:function() {
    return 4;
  },
  execute:function(cpu, bytes) {
    cpu.cycle_count+=5;

    var memory_location = ((bytes[1]<<8)|bytes[0]) + cpu.r.x;
    if(memory_location & 0x10000) {
      bytes[2]++;
      memory_location &= 0xffff;
    }

    if(cpu.p.e||cpu.p.m) {
      cpu.r.a = cpu.mmu.read_byte_long(memory_location, bytes[2]);
      cpu.p.n = cpu.r.a >> 7;
    } else {
      cpu.cycle_count++;

      var low_byte = cpu.mmu.read_byte_long(memory_location, bytes[2]);
      memory_location++;
      if(memory_location & 0x10000) {
        bytes[2]++;
        memory_location &= 0xffff;
      }
      var high_byte = cpu.mmu.read_byte_long(memory_location, bytes[2]);
      cpu.r.a = (high_byte<<8) | low_byte;
      cpu.p.n = cpu.r.a >> 15;
    }
    cpu_lib.r.p.check_z(cpu, cpu.r.a);
  }
};

var LDA_absolute = new cpu_lib.addressing.Absolute(LDA_const);

var LDX_const = {
  bytes_required: function(cpu) {
    if(cpu.p.e||cpu.p.x) {
      return 2;
    } else {
      return 3;
    }
  },
  execute: function(cpu, bytes) {
    cpu.cycle_count+=2;

    if(cpu.p.e||cpu.p.x) {
      cpu.r.x = bytes[0];
      cpu.p.n = cpu.r.x >> 7;
    } else {
      cpu.cycle_count++;

      cpu.r.x = (bytes[1]<<8)|bytes[0];
      cpu.p.n = cpu.r.x >> 15;
    }
    cpu_lib.r.p.check_z(cpu, cpu.r.x);
  }
};

var LDX_direct_page = new cpu_lib.addressing.Direct_page(LDX_const);

var LDX_absolute = new cpu_lib.addressing.Absolute(LDX_const);

// Set bits in the p status register as specified by 1's in the position
// that represents each register.
var SEP = {
  bytes_required: function() { return 2; },
  execute: function(cpu, bytes) {
    // TODO: Figure out exactly how behavior differs in emulation mode.

    cpu.cycle_count+=3;

    var flags = bytes[0].toString(2),
        ops = { 0: function() { cpu.p.n = 1; }, 1: function() { cpu.p.v = 1; },
            2: function() { cpu.p.m = 1; }, 3: function() { cpu.p.x = 1; },
            4: function() { cpu.p.d = 1; }, 5: function() { cpu.p.i = 1; },
            6: function() { cpu.p.z = 1; },
            7: function() { cpu.p.c = 1; }};

    // Sometimes it cuts off zeros before hand, so add those zeros back.
    while(flags.length<8) {
      flags = '0' + flags;
    }

    for(var i = 0; i < 8; i++) {
      if(flags.charAt(i)==='1') {
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
    // TODO: Figure out exactly how behavior differs in emulation mode.

    cpu.cycle_count+=3;

    var flags = bytes[0].toString(2),
        ops = { 0: function() { cpu.p.n = 0; }, 1: function() { cpu.p.v = 0; },
            2: function() { cpu.p.m = 0; }, 3: function() { cpu.p.x = 0; },
            4: function() { cpu.p.d = 0; }, 5: function() { cpu.p.i = 0; },
            6: function() { cpu.p.z = 0; },
            7: function() { cpu.p.c = 0; }};

    // Sometimes it cuts off zeros before hand, so add those zeros back.
    while(flags.length<8) {
      flags = '0' + flags;
    }

    for(var i = 0; i < 8; i++) {
      if(flags.charAt(i)==='1') {
        ops[i]();
      }
    }
  }
};

var XCE = {
  bytes_required: function() { return 1; },
  execute: function(cpu) {
    cpu.cycle_count+=2;

    var temp = cpu.p.c;
    cpu.p.c = cpu.p.e;
    cpu.p.e = temp;
    if(cpu.p.e) {
      // Switching to emulation mode.
      cpu.r.b = cpu.r.a >> 8;
      cpu.r.a &= 0x00ff;
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
    cpu.cycle_count+=2;
    cpu.p.c = 0;
  }
};

var SEI = {
  bytes_required: function() { return 1; },
  execute: function(cpu) {
    cpu.cycle_count+=2;
    cpu.p.i = 1;
  }
};

var CLI = {
  bytes_required: function() { return 1; },
  execute: function(cpu) {
    cpu.cycle_count+=2;
    cpu.p.i = 0;
  }
};

var SEC = {
  bytes_required: function() { return 1; },
  execute: function(cpu) {
    cpu.cycle_count+=2;
    cpu.p.c = 1;
  }
};

var CLD = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=2;
    cpu.p.d = 0;
  }
};

var SED = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=2;
    cpu.p.d = 1;
  }
};

var CLV = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=2;
    cpu.p.v = 0;
  }
};

var XBA = {
  bytes_required:function() {
    return 1;
  },
  execute:function(cpu) {
    cpu.cycle_count+=3;

    if(cpu.p.e||cpu.p.m) {
      cpu.cycle_count+=2;
      var old_a = cpu.r.a;
      cpu.r.a = cpu.r.b;
      cpu.r.b = old_a;

      cpu.p.n = cpu.r.a >> 7;
      cpu_lib.r.p.check_z(cpu, cpu.r.a);
    } else {
      var low_byte = cpu.r.a & 0xff;
      var high_byte = cpu.r.a >> 8;
      cpu.r.a = (low_byte<<8)|high_byte;

      cpu.p.n = high_byte >> 7;
      cpu_lib.r.p.check_z(cpu, high_byte);
    }
  }
};

var MMU = function() {
  this.cpu = {};
  this.memory = { 0: {} };
  this.memory_mapped_io_devices = {};

  this.reset = function() {
    this.memory ={ 0: {} };
  };

  this.add_memory_mapped_io_device = function(write_callback, read_callback,
                                        bank, location) {
    if(typeof this.memory_mapped_io_devices[bank] === 'undefined') {
      this.memory_mapped_io_devices[bank] = {};
    }
    this.memory_mapped_io_devices[bank][location] = { write: write_callback,
                                                      read: read_callback };
  };

  this.pull_byte = function() {
    if(this.cpu.p.e) {
      if(this.cpu.r.s===0xff) {
        this.cpu.r.s = 0;
        return this.read_byte(0x100);
      } else {
        return this.read_byte(0x100|(++this.cpu.r.s));
      }
    } else {
      return this.read_byte(++this.cpu.r.s);
    }
  };

  this.push_byte = function(b) {
    if(this.cpu.p.e) {
      if(this.cpu.r.s===0) {
    this.store_byte(0x100, b);
        this.cpu.r.s = 0xff;
      } else {
        this.store_byte((0x100|(this.cpu.r.s--)), b);
      }
    } else {
      this.store_byte(this.cpu.r.s--, b);
    }
  };

  this.read_byte = function(memory_location) {
    memory_location &= 0xffff; // Make sure the address is 16 bits.

    var device_map_at_bank = this.memory_mapped_io_devices[this.cpu.r.dbr];
    if(typeof device_map_at_bank !== "undefined") {
      var device = device_map_at_bank[memory_location];
      if(typeof device !== "undefined")
        return device.read(this.cpu);
    }
    return this.memory[this.cpu.r.dbr][memory_location];
  };

  this.read_byte_long = function(memory_location, bank) {
    // Make sure addresses given are the proper size.
    memory_location &= 0xffff;
    bank &= 0xff;

    if(typeof this.memory[bank] === 'undefined') {
      this.memory[bank] = {};
    }
    var device_map_at_bank = this.memory_mapped_io_devices[bank];
    if(typeof device_map_at_bank !== "undefined") {
      var device = device_map_at_bank[memory_location];
      if(typeof device !== "undefined")
        return device.read(this.cpu);
    }
    return this.memory[bank][memory_location];
  };

  this.store_byte = function(memory_location, b) {
    memory_location &= 0xffff; // Make sure the address is 16 bits
    b &= 0xff; // Make sure the byte is actually a byte long

    var device_map_at_bank = this.memory_mapped_io_devices[this.cpu.r.dbr];
    if(typeof device_map_at_bank !== "undefined") {
      var device = device_map_at_bank[memory_location];
      if(typeof device !== "undefined")
        device.write(this.cpu, b);
    }
    this.memory[this.cpu.r.dbr][memory_location] = b;
  };

  this.store_byte_long = function(memory_location, bank, b) {
    // Make sure addresses and byte given are the proper size.
    memory_location &= 0xffff;
    bank &= 0xff;
    b &= 0xff;

    if(typeof this.memory[bank] === 'undefined') {
      this.memory[bank] = {};
    }
    var device_map_at_bank = this.memory_mapped_io_devices[bank];
    if(typeof device_map_at_bank !== "undefined") {
      var device = device_map_at_bank[memory_location];
      if(typeof device !== "undefined")
        device.write(this.cpu, b);
    }
    this.memory[bank][memory_location] = b;
  };

  this.read_word = function(memory_location) {
    return (this.read_byte(memory_location+1)<<8) |
           this.read_byte(memory_location);
  };

  this.read_word_long = function(memory_location, bank) {
    return (this.read_byte_long(memory_location+1, bank)<<8) |
           this.read_byte_long(memory_location, bank);
  };

  this.store_word = function(memory_location, word_or_low_byte, high_byte) {
    // If no high_byte is given then assume word_or_low_byte is a word.
    if(typeof high_byte === 'undefined') {
      this.store_byte(memory_location, word_or_low_byte&0xff);
      this.store_byte(memory_location+1, word_or_low_byte>>8);
    } else {
      this.store_byte(memory_location, low_byte);
      this.store_byte(memory_location+1, high_byte);
    }
  };

  this.store_word_long = function(memory_location, bank, word_or_low_byte,
                                  high_byte) {
    // If no high_byte is given then assume word_or_low_byte is a word.
    if(typeof high_byte === 'undefined') {
      this.store_byte_long(memory_location, bank, word_or_low_byte&0xff);
      this.store_byte_long(memory_location+1, bank, word_or_low_byte>>8);
    } else {
      this.store_byte_long(memory_location, bank, low_byte);
      this.store_byte_long(memory_location+1, bank, high_byte);
    }
  };
};

window.CPU_65816 = function() {
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

  this.INTERRUPT = { NO_INTERRUPT: 0, NMI: 1, RESET: 2, ABORT: 3, COP: 4,
                     IRQ: 5, BRK: 6 };

  this.interrupt = this.INTERRUPT.NO_INTERRUPT;

  // This is used to keep the cpu going if started with start().
  this.executing = false;

  // This is set by the WAI operation to stop execution until an interrupt
  // is received.
  this.waiting = false;

  // This is set by the STP operation to stop execution until a RESET
  // interrupt is received.
  this.stopped = false;

  this.raise_interrupt = function(i) {
    if(this.waiting) {
      this.waiting = false;
      if(this.p.i) {
        if(i===this.INTERRUPT.IRQ) {
          i = this.INTERRUPT.NO_INTERRUPT;
        }
      }
      this.interrupt = i;
      this.start();
    } else if(this.stopped&&(i===this.INTERRUPT.RESET)) {
      this.stopped = false;
      this.start();
    } else {
      this.interrupt = i;
    }
  };

  this.cycle_count = 0;

  this.mmu = new MMU();
  this.mmu.cpu = this;

  this.opcode_map = { 0xfb : XCE, 0x18 : CLC, 0x78 : SEI, 0x38 : SEC,
                      0x58 : CLI, 0xc2 : REP, 0xe2 : SEP, 0xd8 : CLD,
                      0xf8 : SED, 0xb8 : CLV, 0xeb : XBA, 0xa9 : LDA_const,
                      0xad : LDA_absolute, 0xaf : LDA_absolute_long,
                      0xbf : LDA_absolute_long_indexed_x,
                      0xa5 : LDA_direct_page, 0xbd : LDA_absolute_indexed_x,
                      0xb5 : LDA_direct_page_indexed_x,
                      0xb9 : LDA_absolute_indexed_y,
                      0xa1 : LDA_direct_page_indexed_x_indirect,
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
                      0x81 : STA_direct_page_indexed_x_indirect,
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
                      0xee : INC_absolute, 0xf6 : INC_direct_page_indexed_x,
                      0xfe : INC_absolute_indexed_x,
                      0xe8 : INX, 0xc8 : INY,
                      0x3a : DEC_accumulator, 0xce : DEC_absolute,
                      0xde : DEC_absolute_indexed_x,
                      0xc6 : DEC_direct_page, 0xca : DEX, 0x88 : DEY,
                      0xd6 : DEC_direct_page_indexed_x,
                      0x9c : STZ_absolute, 0x64 : STZ_direct_page,
                      0x9e : STZ_absolute_indexed_x,
                      0x74 : STZ_direct_page_indexed_x, 0x9b : TXY,
                      0xbb : TYX, 0xaa : TAX, 0xa8 : TAY, 0x8a : TXA,
                      0x98 : TYA, 0x5b : TCD, 0x7b : TDC, 0x1b : TCS,
                      0x3b : TSC, 0x4c : JMP_absolute,
                      0x5c : JMP_absolute_long,
                      0xdc : JMP_absolute_indirect_long,
                      0x7c : JMP_absolute_indexed_x_indirect,
                      0x6c : JMP_absolute_indirect, 0x80 : BRA, 0x82 : BRL,
                      0xf0 : BEQ, 0xd0 : BNE, 0x90 : BCC, 0xb0 : BCS,
                      0x50 : BVC, 0x70 : BVS, 0x10 : BPL, 0x30 : BMI,
                      0x69 : ADC_const, 0x6d : ADC_absolute,
                      0x61 : ADC_direct_page_indexed_x_indirect,
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
                      0xe1 : SBC_direct_page_indexed_x_indirect,
                      0xe7 : SBC_direct_page_indirect_long,
                      0xf7 : SBC_direct_page_indirect_long_indexed_y,
                      0xf1 : SBC_direct_page_indirect_indexed_y,
                      0xfd : SBC_absolute_indexed_x,
                      0xf9 : SBC_absolute_indexed_y,
                      0xf5 : SBC_direct_page_indexed_x,
                      0xe3 : SBC_stack_relative,
                      0xf3 : SBC_stack_relative_indirect_indexed_y,
                      0xc9 : CMP_const, 0xc5 : CMP_direct_page,
                      0xcd : CMP_absolute, 0xd2 : CMP_direct_page_indirect,
                      0xcf : CMP_absolute_long,
                      0xdf : CMP_absolute_long_indexed_x,
                      0xc7 : CMP_direct_page_indirect_long,
                      0xd7 : CMP_direct_page_indirect_long_indexed_y,
                      0xd5 : CMP_direct_page_indexed_x,
                      0xc1 : CMP_direct_page_indexed_x_indirect,
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
                      0x21 : AND_direct_page_indexed_x_indirect,
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
                      0x01 : ORA_direct_page_indexed_x_indirect,
                      0x07 : ORA_direct_page_indirect_long,
                      0x17 : ORA_direct_page_indirect_long_indexed_y,
                      0x11 : ORA_direct_page_indirect_indexed_y,
                      0x1d : ORA_absolute_indexed_x,
                      0x19 : ORA_absolute_indexed_y,
                      0x15 : ORA_direct_page_indexed_x,
                      0x03 : ORA_stack_relative,
                      0x13 : ORA_stack_relative_indirect_indexed_y,
                      0x49 : EOR_const, 0x4d : EOR_absolute,
                      0x4f : EOR_absolute_long,
                      0x5f : EOR_absolute_long_indexed_x,
                      0x45 : EOR_direct_page,
                      0x52 : EOR_direct_page_indirect,
                      0x41 : EOR_direct_page_indexed_x_indirect,
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
                      0x20 : JSR, 0xfc : JSR_absolute_indexed_x_indirect,
                      0x60 : RTS, 0x22 : JSL, 0x6b : RTL,
                      0x54 : MVN, 0x44 : MVP, 0x00 : BRK, 0x40 : RTI,
                      0x02 : COP, 0x89 : BIT_const, 0x2c : BIT_absolute,
                      0x24 : BIT_direct_page,
                      0x3c : BIT_absolute_indexed_x,
                      0x34 : BIT_direct_page_indexed_x,
                      0x0c : TSB_absolute, 0x04 : TSB_direct_page,
                      0x1c : TRB_absolute, 0x14 : TRB_direct_page,
                      0x9a : TXS, 0xba : TSX, 0x42: WDM, 0xcb : WAI,
                      0xdb : STP };

  /**
   * Load given program into memory and prepare for execution.
   * raw_hex could either be a string of hex numbers or an array
   * of bytes.
   */
  this.load_binary = function(raw_hex, memory_location_start, bank) {
    var byte_buffer = [],
        i = 0;

    if(typeof bank === "undefined") {
      bank = 0;
    }

    if(typeof raw_hex === 'string') {
      for(;i < raw_hex.length; i++) {
        byte_buffer.push(raw_hex.charAt(i));
        if(byte_buffer.length===2) {
          this.mmu.store_byte_long(memory_location_start, bank,
                                   parseInt(byte_buffer[0]+byte_buffer[1],
                                            16));
          memory_location_start++;
          byte_buffer = [];
        }
      }
    } else {
      for(;i < raw_hex.length; i++) {
        this.mmu.store_byte_long(memory_location_start, bank, raw_hex[i]);
        memory_location_start++;
      }
    }
  };

  /**
   * Step through the processing of a single instruction from the current
   * location of the program counter.
   */
  this.step = function() {
    if(this.interrupt&&(!this.p.i||(this.interrupt===this.INTERRUPT.NMI))) {
      // Load the related interrupt vector in page 0xff of bank zero.
      if(!this.p.e) {
        this.mmu.push_byte(this.r.k);
      }
      this.mmu.push_byte(this.r.pc>>8);
      this.mmu.push_byte(this.r.pc&0xff);
      var p_byte = (this.p.n<<7)|(this.p.v<<6)|(this.p.m<<5)|(this.p.x<<4)|
                   (this.p.d<<3)|(this.p.i<<2)|(this.p.z<<1)|this.p.c;
      this.mmu.push_byte(p_byte);
      if(!this.p.e)
        this.p.d = 0;
      this.p.i = 1;
      this.r.k = 0;

      var low_byte, high_byte;
      // Look for where to jump to for the interrupt.
      if(this.p.e) {
        // NMI
        if(this.interrupt===this.INTERRUPT.NMI) {
          low_byte = this.mmu.read_byte_long(0xfffa, 0);
          high_byte = this.mmu.read_byte_long(0xfffb, 0);
          this.r.pc = (high_byte<<8)|low_byte;
        // RESET
        } else if(this.interrupt===this.INTERRUPT.RESET) {
          low_byte = this.mmu.read_byte_long(0xfffc, 0);
          high_byte = this.mmu.read_byte_long(0xfffd, 0);
          this.r.pc = (high_byte<<8)|low_byte;
        // ABORT
        } else if(this.interrupt===this.INTERRUPT.ABORT) {
          low_byte = this.mmu.read_byte_long(0xfff8, 0);
          high_byte = this.mmu.read_byte_long(0xfff9, 0);
          this.r.pc = (high_byte<<8)|low_byte;
        // COP
        } else if(this.interrupt===this.INTERRUPT.COP) {
          low_byte = this.mmu.read_byte_long(0xfff4, 0);
          high_byte = this.mmu.read_byte_long(0xfff5, 0);
          this.r.pc = (high_byte<<8)|low_byte;
        // IRQ or BRK
        } else if(this.interrupt===this.INTERRUPT.IRQ ||
                  this.interrupt===this.INTERRUPT.BRK) {
          low_byte = this.mmu.read_byte_long(0xfffe, 0);
          high_byte = this.mmu.read_byte_long(0xffff, 0);
          this.r.pc = (high_byte<<8)|low_byte;
        }
      } else {
        // NMI
        if(this.interrupt===this.INTERRUPT.NMI) {
          low_byte = this.mmu.read_byte_long(0xffea, 0);
          high_byte = this.mmu.read_byte_long(0xffeb, 0);
          this.r.pc = (high_byte<<8)|low_byte;
        // ABORT
        } else if(this.interrupt===this.INTERRUPT.ABORT) {
          low_byte = this.mmu.read_byte_long(0xffe8, 0);
          high_byte = this.mmu.read_byte_long(0xffe9, 0);
          this.r.pc = (high_byte<<8)|low_byte;
        // COP
        } else if(this.interrupt===this.INTERRUPT.COP) {
          low_byte = this.mmu.read_byte_long(0xffe4, 0);
          high_byte = this.mmu.read_byte_long(0xffe5, 0);
          this.r.pc = (high_byte<<8)|low_byte;
        // IRQ
        } else if(this.interrupt===this.INTERRUPT.IRQ) {
          low_byte = this.mmu.read_byte_long(0xffee, 0);
          high_byte = this.mmu.read_byte_long(0xffef, 0);
          this.r.pc = (high_byte<<8)|low_byte;
        // BRK
        } else if(this.interrupt===this.INTERRUPT.BRK) {
          low_byte = this.mmu.read_byte_long(0xffe6, 0);
          high_byte = this.mmu.read_byte_long(0xffe7, 0);
          this.r.pc = (high_byte<<8)|low_byte;
        }
      }

      this.interrupt = this.INTERRUPT.NO_INTERRUPT;
    }

    var b = this.mmu.read_byte_long(this.r.pc, this.r.k);
    this.r.pc++;

    // If we reach the end of the code then stop everything.
    if(typeof b === "undefined") {
      this.executing = false;
      return;
    }
    var operation = this.opcode_map[b];
    var bytes_required = operation.bytes_required(this);
    if(bytes_required===1) {
      operation.execute(this);
    } else {
      var bytes = [];
      for(var i = 1; i < bytes_required; i++) {
        bytes.push(this.mmu.read_byte_long(this.r.pc, this.r.k));
        this.r.pc++;
      }
      operation.execute(this,bytes);
    }

    if(this.waiting||this.stopped)
      this.executing = false;
  };

  this.execute = function(start_address, max_cycles_per_second) {
    // Default to 1MHz if no number given.
    if(typeof max_cycles_per_second === "undefined") {
      max_cycles_per_second = 1000000;
    }

    this.r.pc = start_address;
    this.timer_run(max_cycles_per_second, 1000);
  };

  this.timer_run = function(max_cycles_per_period, period) {
    var start = new Date().getTime();
    this.executing = true;
    while(this.executing) {
      this.step();
      // If execution stopped other than because of the cycle count
      if(!this.executing) {
        return;
      }
      if(this.cycle_count>=max_cycles_per_period) {
        this.executing = false;
        var now = new Date().getTime();
        var wait = period - (now - start);
        this.cycle_count = 0;
        if(wait>0) {
          setTimeout(this.timer_run.bind(this, max_cycles_per_period, period), wait);
        } else {
          this.timer_run(max_cycles_per_period, period);
        }
      }
    }
  };

  this.reset = function() {
    this.executing = false;
    this.waiting = false;
    this.stopped = false;
    this.interrupt = this.INTERRUPT.NO_INTERRUPT;
    this.r = { a:0, b:0, x:0, y:0, d:0, s:0xff, pc:0, dbr:0, k:0 };
    this.p = { e:1, c:0, z:0, i:0, d:0, x:0, m:0, v:0, n:0 };
    this.mmu.reset();
    this.cycle_count = 0;
  };
};
})(window);
