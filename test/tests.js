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

function run_tests() {
  test_lda();
  test_stz();
  test_rep();
  test_sep();
  test_branching();
  test_adc();
  test_sbc();
  test_cmp();
  test_subroutines();
  test_mvn_and_mvp();
  test_emulation_mode();
}

function test_lda() {
  module("LDA");
  test("Make sure LDA with a constant properly loads an 8-bit value in "+
       "8-bit memory/accumulator mode.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fba9ff", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0xff, "The accumulator should be 0xff when 0xff is "+
                          "given as its argument in 8-bit "+
                          "memory/accumulator mode.");
    equals(cpu.p.m, 1,    "m flag of the p status register should be 1 for "+
                          "8-bit memory/accumulator mode.");
    equals(cpu.p.e, 0,    "Hidden e flag of the p status register should be "+
                          "0 for native mode");
  });
  test("Make sure LDA with a constant properly loads a 16-bit value in "+
       "16-bit memory/accumulator mode.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbc220a9ffff", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0xffff, "The accumulator should be 0xffff when 0xffff is "+
                            "given as its argument in 16-bit "+
                            "memory/accumulator mode.");
    equals(cpu.p.m, 0,    "m flag of the p status register should be 0 for "+
                          "16-bit memory/accumulator mode.");
    equals(cpu.p.e, 0,    "Hidden e flag of the p status register should be "+
                          "0 for native mode");

  });
  test("Make sure LDA with a direct page address loads an 8-bit value in "+
       "8-bit memory/accumulator mode.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fba90185fea5fe", 0x8000); 
    cpu.execute(0x8000);
    equals(cpu.r.a, 1, "The accumulator should be 1 when 1 is "+
                       "loaded from $fe(direct page) in 8-bit "+
                       "memory/accumulator mode.");
    equals(cpu.p.m, 1, "m flag of the p status register should be 1 for "+
                       "8-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "Hidden e flag of the p status register should be 0 "+
                       "for native mode");
  });
  test("Make sure LDA with a direct page address loads a 16-bit value in "+
       "16-bit memory/accumulator mode.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbc220a901ff85fea5fe", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0xff01, "The accumulator should be 0xff01 when 0xff01 "+
                            "is loaded from $fe(direct page) in 16-bit "+
                            "memory/accumulator mode.");
    equals(cpu.p.m, 0, "m flag of the p status register should be 0 for "+
                       "16-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "Hidden e flag of the p status register should be 0 "+
                       "for native mode."); 
  });
  test("Make sure LDA with an absolute address loads an 8-bit value in "+
       "8-bit memory/accumulator mode.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fba9fe8dff0aa900adff0a", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0xfe, "The accumulator should be 0xfe when 0xfe is "+
                          "loaded from $0aff(absolute) in 8-bit "+
                          "memory/accumulator mode.");
    equals(cpu.p.m, 1, "m flag of the p status register should be 1 for "+
                       "8-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "Hidden e flag of the p status register should be 0 "+
                       "for native mode.");
  });
  test("Make sure LDA with an absolute address loads a 16-bit value in "+
       "16-bit memory/accumulator mode.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbc220a9ffff8dff0aa90000adff0a", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0xffff, "The accumulator should be 0xffff when 0xffff "+
                            "is loaded from $0aff and $0b00(absolute) in 16-bit "+
                            "memory/accumulator mode.");
    equals(cpu.p.m, 0, "m flag of the p status register should be 0 for "+
                       "16-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "Hidden e flag of the p status register should be 0 "+
                       "for native mode.");
  });
  test("Make sure LDA with a direct page address indexed with the x "+
       "register loads an 8-bit value in 8-bit memory/accumulator mode.",
       function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fba201a9ff85ffa900b5fe", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0xff, "The accumulator should be 0xff when 0xff "+
                          "is loaded from direct page address $fe indexed "+
                          "with x(which is 1) and thus loaded from $ff in "+
                          "8-bit memory/accumulator mode.");
    equals(cpu.r.x, 1, "The x register should be 1 in order to be used as "+
                       "an index with the base address to get to the "+
                       "desired address.");
    equals(cpu.p.m, 1, "m flag of the p status register should be 1 for "+
                       "8-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "Hidden e flag of the p status register should be 0 "+
                       "for native mode.");
  });
  test("Make sure LDA with a direct page address indexed with the x "+
       "register loads a 16-bit value in 16-bit memory/accumulator mode.",
       function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbc220a201a9ffff85fea90000bdfd", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0xffff, "The accumulator should be 0xffff when 0xffff "+
                            "is loaded from direct page addresses $fe and "+
                            "$ff after $fd is indexed with the x register("+
                            "which is 1) in 16-bit memory/accumulator mode.");
    equals(cpu.r.x, 1, "The x register should be 1 in order to be used as "+
                       "an index with the base address to get to the "+
                       "desired address.");
    equals(cpu.p.m, 0, "m flag of the p status register should be 0 for "+
                       "16-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "Hidden e flag of the p status register should be 0 "+
                       "for native mode.");
  }); 
  test("Make sure LDA indirect given a direct page address loads an 8-bit "+
       "value in 8-bit memory/accumulator mode.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fba9ff85fea90a85ffa9068dff0aa900b2fe", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 6, "The accumulator should be 6 when LDA loads an 8-bit "+
                       "value using an indirect address in 8-bit mode "+
                       "memory/accumulator mode.");
    equals(cpu.p.m, 1, "m flag of the p status register should be 1 for "+
                       "8-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "Hidden e flag of the p status register should be 0 "+
                       "for native mode.");
  });
  test("Make sure LDA indirect given a direct page address loads a 16-bit "+
       "value in 16-bit memory/accumulator mode.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbc220a9ff0a85fea9ffff8dff0aa90000b2fe", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0xffff, "The accumulator should be 0xffff when LDA loads "+
                            "a 16-bit value using an indirect address "+
                            "loaded from a direct page address.");
    equals(cpu.p.m, 0, "The m flag of the p status register should be 0 for "+
                       "16-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "Hidden e flag of the p status register should be 0 "+
                       "for native mode.");
  });
  test("Ensure that LDA absolute indexed by the x register works for 8-bit "+
       "memory/accumulator mode.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fba9fa8dff0aa201a900bdfe0a", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0xfa, "The accumulator should be 0xfa when LDA loads "+
                          "an 8-bit value using absolute indexed x mode "+
                          "from $0aff");
    equals(cpu.r.x, 1,   "The x register should be 1 to properly load "+
                         "the value added to the base address.");
    equals(cpu.p.m, 1, "The m flag of the p status register should be 1 for "+
                       "8-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "Hidden e flag of the p status register should be 0 "+
                       "for native mode.");
  }); 
  test("Ensure that LDA absolute indexed by the x register works for 16-bit "+
       "memory/accumulator mode.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbc220a9fefa8dff0aa203bdfc0a", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0xfafe, "The accumulator should be 0xfafe when LDA "+
                            "loads a 16-bit value from $0aff using "+
                            "absolute indexed x addressing mode.");
    equals(cpu.r.x, 3,   "The x register should be 3 to properly load "+
                         "the value added to the base address.");
    equals(cpu.p.m, 0, "The m flag of the p status register should be 0 for "+
                       "16-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "Hidden e flag of the p status register should be 0 "+
                       "for native mode.");
  });
  test("Ensure that LDA absolute indexed by the y register works for 8-bit "+
       "memory/acccumulator mode.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fba9fe8dff0aa002a900b9fd0a", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0xfe, "The accumulator should be 0xfe when LDA loads an "+
                          "8-bit value from $0aff using absolute indexed y "+
                          "addressing mode."); 
    equals(cpu.r.y, 2, "The y register should be 2 to properly load the "+
                       "value added to the base address.");
    equals(cpu.p.m, 1, "The m flag of the p status register should be 1 for "+
                       "8-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "Hidden e flag of the p status register should be 0 "+
                       "for native mode.");
  });
  test("Ensure that LDA absolute indexed by the y register works for 16-bit "+
       "memory/accumulator mode.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbc220a9fefa8dff0aa003a90000b9fc0a", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0xfafe, "The accumulator should be 0xfafe when LDA loads "+
                            "a 16-bit value from $0aff using absolute "+
                            "indexed y addressing mode.");
    equals(cpu.r.y, 3, "The y register should be 3 to properly load the "+
                       "value added to the base address.");
    equals(cpu.p.m, 0, "The m flag of the p status register should be 0 for "+
                       "16-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "Hidden e flag of the p status register should be 0 "+
                       "for native mode.");
  });
  test("Ensure that LDA stack relative works for 8-bit memory/accumulator "+
       "mode.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fba9fe48a90148a900a302", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0xfe, "The accumulator should be 0xfe when LDA loads "+
                          "an 8-bit value from the stack using LDA stack "+
                          "relative addressing mode.");
    equals(cpu.p.m, 1, "The m flag of the p status register should be 1 for "+
                       "8-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "Hidden e flag of the p status register should be 0 "+
                       "for native mode.");
  });
  test("Ensure that LDA stack relative works for 16-bit memory/accumulator "+
       "mode.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbc220a9fefa48a9010048a90000a303", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0xfafe, "The accumulator should be 0xfafe when LDA "+
                            "loads a 16-bit value from the stack using LDA "+
                            "stack relative addressing mode.");
    equals(cpu.p.m, 0, "The m flag of the p status register should be 0 for "+
                       "16-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "Hidden e flag of the p status register should be 0 "+
                       "for native mode.");
  });
  test("Ensure that LDA absolute long works for 8-bit memory/accumulator "+
       "mode.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fba9fa8fffeeaaa900afffeeaa", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0xfa, "The accumulator should be 0xfa when LDA "+
                          "loads an 8-bit value from $aaeeff using "+
                          "absolute long addressing mode.");
    equals(cpu.p.m, 1, "The m flag of the p status register should be 1 for "+
                       "8-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "Hidden e flag of the p status register should be 0 "+
                       "for native mode.");
  });
  test("Ensure that LDA absolute long works for 16-bit memory/accumulator "+
       "mode.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbc220a9fefa8fffeeaaa90000afffeeaa", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0xfafe, "The accumulator should be 0xfafe when LDA "+
                            "loads a 16-bit value from $aaeeff using "+
                            "absolute long addressing mode.");
    equals(cpu.p.m, 0, "The m flag of the p status register should be 0 for "+
                       "16-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "Hidden e flag of the p status register should be 0 "+
                       "for native mode.");
  });
  test("Ensure that LDA absolute long indexed by the x register works for "+
       "8-bit memory/accumulator mode.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fba9fe8fffeeaaa202a900bffdeeaa", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0xfe, "The accumulator should be 0xfe when LDA "+
                          "loads an 8-bit value from $aaeeff using "+
                          "absolute long indexed x addressing mode.");
    equals(cpu.r.x, 2, "The x register should be 2 in order to be used as "+
                       "an index to reach the correct address.");
    equals(cpu.p.m, 1, "The m flag of the p status register should be 1 for "+
                       "8-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "Hidden e flag of the p status register should be 0 "+
                       "for native mode.");
  });
  test("Ensure that LDA absolute long indexed by the x register works for "+
       "16-bit memory/accumulator mode.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbc220a9fefa8fffeeaaa203a90000bffceeaa", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0xfafe, "The accumulator should be 0xfafe when LDA "+
                            "loads a 16-bit value from $aaeeff using "+
                            "absolute long indexed x addressing mode."); 
    equals(cpu.r.x, 3, "The x register should be 3 in order to be used as "+
                       "an index to reach the correct address.");
    equals(cpu.p.m, 0, "The m flag of the p status register should be 0 for "+
                       "16-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "Hidden e flag of the p status register should be 0 "+
                       "for native mode.");
  });
}

function test_stz() {
  module("STZ");
  test("Test STZ direct page for 8-bit memory/accumulator mode.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fba9ff85fa64faa5fa", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0, "The accumulator should be zero after loading from a "+
                       "direct page addresss that has had zero stored to it.");
    equals(cpu.p.e, 0, "The hidden e flag should be zero for native mode.");
    equals(cpu.p.m, 1, "The m flag should be one for 8-bit "+
                       "memory/accumulator mode.");
  });
  test("Test STZ direct page for 16-bit memory/accumulator mode.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbc220a9ffff85fa64faa5fa", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0, "The accumulator should be zero after loading from a "+
                       "direct page address that had zero stored to it.");
    equals(cpu.p.e, 0, "The hidden e flag should be zero for native mode.");
    equals(cpu.p.m, 0, "The m flag should be zero for 16-bit "+
                       "memory/accumulator mode.");
  });
  test("Test STZ absolute for 8-bit memory/accumulator mode.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fba9ff8d34129c3412ad3412", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0, "The accumulator should be zero after loading from an "+
                       "absolute address that had zero stored to it.");
    equals(cpu.p.e, 0, "The hidden e flag should be zero for native mode.");
    equals(cpu.p.m, 1, "The m flag should be one for 8-bit "+
                       "memory/accumulator mode.");
  });
  test("Test STZ absolute for 16-bit memory/accumulator mode.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbc220a9ffff8d34129c3412ad3412", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0, "The accumulator should be zero after loading from an "+
                       "absolute page address that had zero stored to it.");
    equals(cpu.p.e, 0, "The hidden e flag should be zero for native mode.");
    equals(cpu.p.m, 0, "The m flag should be zero for 16-bit "+
                       "memory/accumulator mode.");
  });
  test("Test STZ direct page indexed by the x register for 8-bit "+
       "memory/accumulator mode.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fba9ff85fb85faa20174faa5fb", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0, "The accumulator should be zero after loading from a "+
                       "direct page addresss that has had zero stored to it.");
    equals(cpu.p.e, 0, "The hidden e flag should be zero for native mode.");
    equals(cpu.p.m, 1, "The m flag should be one for 8-bit "+
                       "memory/accumulator mode.");
  });
  test("Test STZ direct page indexed by the x register for 16-bit "+
       "memory/accumulator mode.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbc220a9ffff85faa20274f8a5fa", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0, "The accumulator should be zero after loading from a "+
                       "direct page address that had zero stored to it.");
    equals(cpu.p.e, 0, "The hidden e flag should be zero for native mode.");
    equals(cpu.p.m, 0, "The m flag should be zero for 16-bit "+
                       "memory/accumulator mode.");
  });
  test("Test STZ absolute indexed by the x register for 8-bit "+
       "memory/accumulator mode.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fba9ff8dbbaa8dbaaaa2019ebaaaadbbaa", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0, "The accumulator should be zero after loading from an "+
                       "absolute address that had zero stored to it.");
    equals(cpu.p.e, 0, "The hidden e flag should be zero for native mode.");
    equals(cpu.p.m, 1, "The m flag should be one for 8-bit "+
                       "memory/accumulator mode.");
  });
  test("Test STZ absolute indexed by the x register for 16-bit "+
       "memory/accumulator mode.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbc220a9ffff8dbbaaa2029eb9aaadbbaa", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0, "The accumulator should be zero after loading from an "+
                       "absolute page address that had zero stored to it.");
    equals(cpu.p.e, 0, "The hidden e flag should be zero for native mode.");
    equals(cpu.p.m, 0, "The m flag should be zero for 16-bit "+
                       "memory/accumulator mode.");
  });
}

function test_emulation_mode() {
  module("Emulation Mode");
  test("Make sure pulling from the stack when the stack register is at 0x1ff"+
       "causes the stack register to pull from 0x100.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("a9fe8d0001a90068", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.s, 0, "The stack register should be 0 after the pull "+
                       "operation.");
    equals(cpu.r.a, 0xfe,  "The accumulator should be 0xfe after the pull "+
                           "operation."); 
  });
}

function test_mvn_and_mvp() {
  module("MVN and MVP");
  test("Test a short example program for MVP", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbe230a9ab8dff0fa9cd8d0010c230a90100a20010a00020440000",
                    0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0xffff, "After executing the example program the "+
                            "accumulator should've underflowed and "+
                            "resulted in 0xffff.");
    equals(cpu.r.x, 0x0ffe, "After executing the example program the x "+
                            "register should be 0x0ffe.");
    equals(cpu.r.y, 0x1ffe, "After executing the example program the y "+
                            "register should be 0x1ffe.");  
    var byte_one = cpu.mmu.read_byte(0x1fff);
    var byte_two = cpu.mmu.read_byte(0x2000);
    equals(byte_one, 0xab,  "After executing the example program 0x001fff "+
                            "in memory should contain 0xab.");
    equals(byte_two, 0xcd,  "After executing the example program 0x002000 "+
                            "in memory should contain 0xcd.");
  });
}

function test_subroutines() {
  module("Subroutines");
  test("Short program to check that JSR and RTS work", function() {
    var cpu = new CPU_65816();
    // It jumps to 0xffff so it doesn't execute the subroutine again and 
    // effectively halts the program.
    cpu.load_binary("18fbc23018a9ffff200e804cffff3a60", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0xfffe, "The subroutine should execute exactly once, "+
                            "decrementing 0xffff to 0xfffe."); 
  });
}

function test_cmp() {
  module("CMP");
  test("Compare two 8-bit numbers, 0x01 and 0xff", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbe23018a901c9ff", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0x01, "CMP should not change the value of the "+
                          "accumulator");
    equals(cpu.p.z, 0, "When comparing 0x01 and 0xff the zero(z) bit "+
                       "should not be set (0x01 != 0xff)");   
    equals(cpu.p.n, 0, "When comparing 0x01 and 0xff the negative(n) bit "+
                       "should not be set"); 
    equals(cpu.p.c, 0, "When comparing 0x01 and 0xff the carry(c) bit "+
                       "should not be set (0x01 < 0xff)");
  });
  test("Compare two 16-bit numbers, 0xff01 and 0xfeff", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbc23018a901ffc9fffe", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0xff01, "CMP should not change the value of the "+
                            "accumulator");
    equals(cpu.p.n, 0, "When comparing 0xff01 and 0xfeff the negative(n) "+
                       "bit should not be set");
    equals(cpu.p.z, 0, "When comparing 0xff01 and 0xfeff the zero(z) bit "+
                       "should not be set (0xff01 != 0xfeff)");
    equals(cpu.p.c, 1, "When comparing 0xff01 and 0xfeff the carry(c) bit "+
                       "should be set (0xff01 >= 0xfeff)"); 
  });
}

function test_sbc() {
  module("SBC");
  test("Test normal subtraction of two 8-bit numbers that don't cause a "+
       "borrow.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbe230a90138e901", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0, "0x01 - 0x01 should result in zero when using "+
                       "SBC");
    equals(cpu.p.z, 1, "0x01 - 0x01 should set the zero(z) bit when "+
                       "using SBC");
    equals(cpu.p.n, 0, "0x01 - 0x01 should not set the negative(n) bit "+
                       "when using SBC");
    equals(cpu.p.v, 0, "0x01 - 0x01 should not set the overflow(v) bit "+
                       "when using SBC");
    equals(cpu.p.c, 1, "0x01 - 0x01 should set the carry(c) bit when using "+
                       "SBC");
  });

  test("Test normal subtraction of two 16-bit numbers that don't cause a "+
       "borrow.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbc230a9010038e90100", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0, "0x0001 - 0x0001 should result in zero when using "+
                       "SBC");
    equals(cpu.p.z, 1, "0x0001 - 0x0001 should set the zero(z) bit when "+
                       "using SBC");
    equals(cpu.p.n, 0, "0x0001 - 0x0001 should not set the negative(n) bit "+
                       "when using SBC");
    equals(cpu.p.v, 0, "0x0001 - 0x0001 should not set the overflow(v) bit "+
                       "when using SBC");
    equals(cpu.p.c, 1, "0x0001 - 0x0001 should set the carry(c) bit when "+
                       "using SBC");
  });
  test("Test subtraction that triggers a borrow with 8-bit numbers", 
       function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbe230a9d038e9ef", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0xe1, "0xd0 - 0xef should set the accumulator to 0xe1 "+
                          "when using SBC");
    equals(cpu.p.n, 1,    "0xd0 - 0xef should set the negative(n) bit when "+ 
                          "using SBC");
    equals(cpu.p.v, 0,    "0xd0 - 0xef should not set the overflow(v) bit "+
                          "when using SBC");
    equals(cpu.p.z, 0,    "0xd0 - 0xef should not set the zero(z) bit when "+
                          "using SBC");
    equals(cpu.p.c, 0,    "0xd0 - 0xef should not set the carry(c) bit when "+
                          "using SBC");  
  });
  test("Test subtraction that triggers a borrow with 16-bit numbers", 
       function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbc230a900d038e900ef", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0xe100, "0xd000 - 0xef00 should set the accumulator to "+
                            "0xe0ff when using SBC");
    equals(cpu.p.n, 1, "0xd000 - 0xef00 should set the negative(n) bit when "+ 
                       "using SBC");
    equals(cpu.p.v, 0, "0xd000 - 0xef00 should not set the overflow(v) bit "+
                       "when using SBC");
    equals(cpu.p.z, 0, "0xd000 - 0xef00 should not set the zero(z) bit when "+
                       "using SBC");
    equals(cpu.p.c, 0, "0xd000 - 0xef00 should not set the carry(c) bit when "+
                       "using SBC");  
  });
  test("Test subtraction with decimal mode on with two single digit 8-bit "+
       "numbers.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbf8a90938e905", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 4, "The accumulator should be 4 after subtracting 0x5 "+
                       "0x9 with decimal mode on with 8-bit "+
                       "memory/accumulator mode.");
    equals(cpu.p.c, 1, "The carry bit should be set after no borrow is "+
                       "triggered."); 
    equals(cpu.p.m, 1, "The m flag of the p status register should be one "+
                       "for 8-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "The hidden e flag of the p status register should "+
                       "be zero for native mode.");
  });
  test("Test subtraction with decimal mode on with two double digit 8-bit "+
       "numbers.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbf8a99038e949", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0x41, "The accumulator should be 41 after subtracting 0x49 "+
                          "from 0x90 with decimal mode on with 8-bit "+
                          "memory/accumulator mode.");
    equals(cpu.p.c, 1, "The carry bit should be set after no borrow is "+
                       "triggered."); 
    equals(cpu.p.m, 1, "The m flag of the p status register should be one "+
                       "for 8-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "The hidden e flag of the p status register should "+
                       "be zero for native mode.");
  });
  test("Test subtraction with decimal mode on with 8-bit numbers that causes "+
       "a borrow.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbf8a91038e920", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0x90, "The accumulator should be 0x90 after subtracting "+
                          "0x20 from 0x10 with decimal and 8-bit "+
                          "memory/accumulator modes.");
    equals(cpu.p.c, 0, "The carry bit should be clear after a borrow is "+
                       "triggered."); 
    equals(cpu.p.m, 1, "The m flag of the p status register should be one "+
                       "for 8-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "The hidden e flag of the p status register should "+
                       "be zero for native mode.");
  });
  test("Test subtraction of two single digit 16-bit numbers with decimal "+
       "mode set.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbc220f8a9050038e90200", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0x03, "The accumulator should be 0x03 after subtracting "+
                          "0x02 from 0x05 with decimal and 16-bit "+
                          "memory/accumulator modes.");
    equals(cpu.p.c, 1, "The carry bit should be set after no borrow is "+
                       "triggered."); 
    equals(cpu.p.m, 0, "The m flag of the p status register should be zero "+
                       "for 16-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "The hidden e flag of the p status register should "+
                       "be zero for native mode.");
  });
  test("Test subtraction of two four digit 16-bit numbers with decimal "+
       "mode set.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbc220f8a9999938e91111", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0x8888, "The accumulator should be 0x8888 after "+
                            "subtracting 0x1111 from 0x9999 with decimal "+
                            "and 16-bit memory/accumulator modes.");
    equals(cpu.p.c, 1, "The carry bit should be set after no borrow is "+
                       "triggered."); 
    equals(cpu.p.m, 0, "The m flag of the p status register should be zero "+
                       "for 16-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "The hidden e flag of the p status register should "+
                       "be zero for native mode.");
  });
  test("Test subtraction of two four digit 16-bit numbers with decimal "+
       "mode set that causes a borrow.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbc220f8a9111138e99999", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0x1112, "The accumulator should be 0x1112 after "+
                            "subtracting 0x9999 from 0x1111 with decimal "+
                            "and 16-bit memory/accumulator modes.");
    equals(cpu.p.c, 0, "The carry bit should be clear after a borrow is "+
                       "triggered."); 
    equals(cpu.p.m, 0, "The m flag of the p status register should be zero "+
                       "for 16-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "The hidden e flag of the p status register should "+
                       "be zero for native mode.");
  });
}

function test_adc() {
  module("ADC");
  test("Test normal addition of two 16-bit numbers that don't cause an "+
       "overflow (m bit is 0)", function() {
     var cpu = new CPU_65816();
     cpu.load_binary("18fb18c230a90100690100", 0x8000);
     cpu.execute(0x8000);
     equals(cpu.r.a, 2, "0x0001 + 0x0001 should result in 0x0002 when using "+
                        "ADC");
     equals(cpu.p.n, 0, "0x0001 + 0x0001 does not result in a negative "+
                        "two's complement number when adding with ADC."); 
     equals(cpu.p.c, 0, "0x0001 + 0x0001 should not set the carry(c) bit when "+
                        "adding with ADC");
     equals(cpu.p.z, 0, "0x0001 + 0x0001 should not set the zero(z) bit when "+
                        "adding with ADC");
     equals(cpu.p.v, 0, "0x0001 + 0x0001 should not set the overflow(v) bit "+
                        "when adding with ADC");
   });
   test("Test normal addition of two 8-bit numbers that don't cause an "+
       "overflow (m bit is 1)", function() {
     var cpu = new CPU_65816();
     cpu.load_binary("18fb18e230a9016901", 0x8000);
     cpu.execute(0x8000);
     equals(cpu.r.a, 2, "0x01 + 0x01 should result in 0x02 when using "+
                        "ADC");
     equals(cpu.p.n, 0, "0x01 + 0x01 does not result in a negative "+
                        "two's complement number when adding with ADC."); 
     equals(cpu.p.c, 0, "0x01 + 0x01 should not set the carry(c) bit when "+
                        "adding with ADC");
     equals(cpu.p.z, 0, "0x01 + 0x01 should not set the zero(z) bit when "+
                        "adding with ADC");
     equals(cpu.p.v, 0, "0x01 + 0x01 should not set the overflow(v) bit "+
                        "when adding with ADC");
   });
  
  test("Test that overflow sets the carry flag and works in general with two"+
       "16-bit numbers (m bit is 0)", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fb18c230a9ffff690100", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.p.c, 1, "0xffff + 0x0001 should set the carry bit when using "+
                       "ADC");
    equals(cpu.r.a, 0, "0xffff + 0x0001 should result in the accumulator "+
                       "being 0 when using ADC");
    equals(cpu.p.n, 0, "0xffff + 0x0001 should not set the negative(n) bit "+
                       "when using ADC");
    equals(cpu.p.z, 1, "0xffff + 0x0001 should set the zero(z) bit when using "+
                       "ADC");
    equals(cpu.p.v, 0, "0xffff + 0x0001 should not set the overflow(v) bit "+
                       "when using ADC");
  });

  test("Test that overflow sets the carry flag and works in general with two"+
       "8-bit numbers (m bit is 1)", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fb18e230a9ff6901", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.p.c, 1, "0xff + 0x01 should set the carry bit when using "+
                       "ADC");
    equals(cpu.r.a, 0, "0xff + 0x01 should result in the accumulator "+
                       "being 0 when using ADC");
    equals(cpu.p.n, 0, "0xff + 0x01 should not set the negative(n) bit when "+
                       "using ADC");
    equals(cpu.p.z, 1, "0xff + 0x01 should set the zero(z) bit when using "+
                       "ADC");
    equals(cpu.p.v, 0, "0xff + 0x01 should not set the overflow(v) bit when "+
                       "using ADC");
  });

  test("Test signed overflow with two 8-bit numbers (m bit is 1)", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fb18e230a97f6901", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0x80, "0x7f + 0x01 should result in 0x80 when "+
                            "using ADC");
    equals(cpu.p.v, 1, "0x7f + 0x01 should set the overflow(v) bit when "+
                       "using ADC");
    equals(cpu.p.c, 0, "0x7f + 0x01 should not set the carry(c) bit when "+
                       "using ADC");
    equals(cpu.p.z, 0, "0x7f + 0x01 should not set the zero(z) bit when "+
                       "using ADC");
    equals(cpu.p.n, 1, "0x7f + 0x01 should set the negative(n) bit when "+
                       "using ADC");   
  });
  test("Test signed overflow with two 16-bit numbers (m bit is 0)", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fb18c230a9ff7f690100", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0x8000, "0x7fff + 0x0001 should result in 0x8000 when "+
                            "using ADC");
    equals(cpu.p.v, 1, "0x7fff + 0x0001 should set the overflow(v) bit when "+
                       "using ADC");
    equals(cpu.p.c, 0, "0x7fff + 0x0001 should not set the carry(c) bit when "+
                       "using ADC");
    equals(cpu.p.z, 0, "0x7fff + 0x0001 should not set the zero(z) bit when "+
                       "using ADC");
    equals(cpu.p.n, 1, "0x7fff + 0x0001 should set the negative(n) bit when "+
                       "using ADC");   
  });

  test("Test ADC direct page with 8-bit numbers (m bit is 1)", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fb18e230a90185ffa97f65ff", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0x80, "0x7f + 0x01 should result in 0x80 when "+
                            "using ADC");
    equals(cpu.p.v, 1, "0x7f + 0x01 should set the overflow(v) bit when "+
                       "using ADC");
    equals(cpu.p.c, 0, "0x7f + 0x01 should not set the carry(c) bit when "+
                       "using ADC");
    equals(cpu.p.z, 0, "0x7f + 0x01 should not set the zero(z) bit when "+
                       "using ADC");
    equals(cpu.p.n, 1, "0x7f + 0x01 should set the negative(n) bit when "+
                       "using ADC");   
  });

  test("Test ADC direct page with 16-bit numbers (m bit is 0)", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fb18c230a9010085fea9ff7f65fe", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0x8000, "0x7fff + 0x0001 should result in 0x8000 when "+
                            "using ADC");
    equals(cpu.p.v, 1, "0x7fff + 0x0001 should set the overflow(v) bit when "+
                       "using ADC");
    equals(cpu.p.c, 0, "0x7fff + 0x0001 should not set the carry(c) bit when "+
                       "using ADC");
    equals(cpu.p.z, 0, "0x7fff + 0x0001 should not set the zero(z) bit when "+
                       "using ADC");
    equals(cpu.p.n, 1, "0x7fff + 0x0001 should set the negative(n) bit when "+
                       "using ADC");   
  });
 
  test("Test ADC absolute with 8-bit numbers (m bit is 1)", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fb18e230a9018dffffa97f6dffff", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0x80, "0x7f + 0x01 should result in 0x80 when "+
                            "using ADC");
    equals(cpu.p.v, 1, "0x7f + 0x01 should set the overflow(v) bit when "+
                       "using ADC");
    equals(cpu.p.c, 0, "0x7f + 0x01 should not set the carry(c) bit when "+
                       "using ADC");
    equals(cpu.p.z, 0, "0x7f + 0x01 should not set the zero(z) bit when "+
                       "using ADC");
    equals(cpu.p.n, 1, "0x7f + 0x01 should set the negative(n) bit when "+
                       "using ADC");   
  });

  test("Test ADC absolute with 16-bit numbers (m bit is 0)", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fb18c230a901008dffffa9ff7f6dffff", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0x8000, "0x7fff + 0x0001 should result in 0x8000 when "+
                            "using ADC");
    equals(cpu.p.v, 1, "0x7fff + 0x0001 should set the overflow(v) bit when "+
                       "using ADC");
    equals(cpu.p.c, 0, "0x7fff + 0x0001 should not set the carry(c) bit when "+
                       "using ADC");
    equals(cpu.p.z, 0, "0x7fff + 0x0001 should not set the zero(z) bit when "+
                       "using ADC");
    equals(cpu.p.n, 1, "0x7fff + 0x0001 should set the negative(n) bit when "+
                       "using ADC");   
  });

  test("Test ADC direct page indirect with 8-bit numbers (m bit is 1)", 
       function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fb18e230a90185ffa9ff85fd64fea97f72fd", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0x80, "0x7f + 0x01 should result in 0x80 when "+
                            "using ADC");
    equals(cpu.p.v, 1, "0x7f + 0x01 should set the overflow(v) bit when "+
                       "using ADC");
    equals(cpu.p.c, 0, "0x7f + 0x01 should not set the carry(c) bit when "+
                       "using ADC");
    equals(cpu.p.z, 0, "0x7f + 0x01 should not set the zero(z) bit when "+
                       "using ADC");
    equals(cpu.p.n, 1, "0x7f + 0x01 should set the negative(n) bit when "+
                       "using ADC");   
  });
  test("Test ADC direct page indirect with 16-bit numbers (m bit is 0)", 
       function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fb18c230a901008500a9000085bba9ff7f72bb", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0x8000, "0x7fff + 0x0001 should result in 0x8000 when "+
                            "using ADC");
    equals(cpu.p.v, 1, "0x7fff + 0x0001 should set the overflow(v) bit when "+
                       "using ADC");
    equals(cpu.p.c, 0, "0x7fff + 0x0001 should not set the carry(c) bit when "+
                       "using ADC");
    equals(cpu.p.z, 0, "0x7fff + 0x0001 should not set the zero(z) bit when "+
                       "using ADC");
    equals(cpu.p.n, 1, "0x7fff + 0x0001 should set the negative(n) bit when "+
                       "using ADC");   

  });
  test("Test that ADC handles decimal mode with legal BCD numbers in 8-bit "+
       "memory/accumulator mode with single digit numbers.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fb18f8a9056905", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0x10, "0x05 + 0x05 should result in 0x10 with decimal "+
                          "mode on and with 8-bit memory/accumulator mode.");
    equals(cpu.p.c, 0, "The carry flag of the p status register should be "+
                       "clear after no decimal overflow.");
    equals(cpu.p.d, 1, "Decimal mode should be set to 1 in the p status "+
                       "register.");
    equals(cpu.p.m, 1, "The m flag of the p status register should be 1 for "+
                       "8-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "The hidden e flag of the p status register should "+
                       "be 0 for native mode.");
  });
  test("Test that ADC handles decimal mode with legal BCD numbers in 8-bit "+
       "memory/accumulator mode with double digit numbers.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fb18f8a9156926", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0x41, "0x15 + 0x26 should result in 0x41 with decimal "+
                          "mode on and with 8-bit memory/accumulator mode.");
    equals(cpu.p.c, 0, "The carry flag of the p status register should be "+
                       "clear after no decimal overflow.");
    equals(cpu.p.d, 1, "Decimal mode should be set to 1 in the p status "+
                       "register.");
    equals(cpu.p.m, 1, "The m flag of the p status register should be 1 for "+
                       "8-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "The hidden e flag of the p status register should "+
                       "be 0 for native mode.");
  });
  test("Test that ADC handles decimal mode with legal BCD numbers in 8-bit "+
       "memory/accumulator mode with double digit numbers with the carry "+
       "bit set", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fb38f8a9156926", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0x42, "0x15 + 0x26 should result in 0x42 with decimal "+
                          "mode on and with 8-bit memory/accumulator mode "+
                          "and the carry bit set.");
    equals(cpu.p.c, 0, "The carry flag of the p status register should be "+
                       "clear after no decimal overflow.");
    equals(cpu.p.d, 1, "Decimal mode should be set to 1 in the p status "+
                       "register.");
    equals(cpu.p.m, 1, "The m flag of the p status register should be 1 for "+
                       "8-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "The hidden e flag of the p status register should "+
                       "be 0 for native mode.");
  });
  test("Test that ADC handles decimal mode with legal BCD numbers in 8-bit "+
       "memory/accumulator mode when adding two numbers that cause an "+
       "overflow.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fb18f8a9556960", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0x16, "0x55 + 0x60 should result in 0x16 with decimal "+
                          "mode on and with 8-bit memory/accumulator mode.");
    equals(cpu.p.c, 1, "The carry flag of the p status register should be "+
                       "set after the decimal overflow.");
    equals(cpu.p.d, 1, "Decimal mode should be set to 1 in the p status "+
                       "register.");
    equals(cpu.p.m, 1, "The m flag of the p status register should be 1 for "+
                       "8-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "The hidden e flag of the p status register should "+
                       "be 0 for native mode.");
  });
  test("Test that ADC handles decimal mode with legal BCD numbers in 16-bit "+
       "memory/accumulator mode when adding two single digit numbers.", 
       function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fb18f8c220a90100690900", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0x10, "0x0001 + 0x0009 should result in 0x0010 with "+
                          "decimal mode on and with 16-bit "+
                          "memory/accumulator mode.");
    equals(cpu.p.c, 0, "The carry flag of the p status register should be "+
                       "clear after no decimal overflow.");
    equals(cpu.p.d, 1, "Decimal mode should be set to 1 in the p status "+
                       "register.");
    equals(cpu.p.m, 0, "The m flag of the p status register should be 0 for "+
                       "16-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "The hidden e flag of the p status register should "+
                       "be 0 for native mode.");
  });
  test("Test that ADC handles decimal mode with legal BCD numbers in 16-bit "+
       "memory/accumulator mode when adding two four digit numbers.", 
       function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fb18f8c220a90110699939", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0x5000, "0x1001 + 0x3999 should result in 0x5000 with "+
                            "decimal mode on and with 16-bit "+
                            "memory/accumulator mode.");
    equals(cpu.p.c, 0, "The carry flag of the p status register should be "+
                       "clear after no decimal overflow.");
    equals(cpu.p.d, 1, "Decimal mode should be set to 1 in the p status "+
                       "register.");
    equals(cpu.p.m, 0, "The m flag of the p status register should be 0 for "+
                       "16-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "The hidden e flag of the p status register should "+
                       "be 0 for native mode.");
  });
  test("Test that ADC handles decimal mode with legal BCD numbers in 16-bit "+
       "memory/accumulator mode when adding two numbers that cause an "+
       "overflow.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fb18f8c220a99756699999", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0x5697, "0x5697 + 0x9999 should result in 0x5697 with "+
                            "decimal mode on and with 16-bit "+
                            "memory/accumulator mode.");
    equals(cpu.p.c, 1, "The carry flag of the p status register should be "+
                       "set after decimal overflow.");
    equals(cpu.p.d, 1, "Decimal mode should be set to 1 in the p status "+
                       "register.");
    equals(cpu.p.m, 0, "The m flag of the p status register should be 0 for "+
                       "16-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "The hidden e flag of the p status register should "+
                       "be 0 for native mode.");
  });
  test("Test that ADC handles decimal mode with legal BCD numbers in 16-bit "+
       "memory/accumulator mode when adding two four digit numbers with the "+
       "carry bit set.", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fb38f8c220a90110699939", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0x5001, "0x1001 + 0x3999 should result in 0x5001 with "+
                            "decimal mode on and with 16-bit "+
                            "memory/accumulator mode and the carry flag set.");
    equals(cpu.p.c, 0, "The carry flag of the p status register should be "+
                       "clear after no decimal overflow.");
    equals(cpu.p.d, 1, "Decimal mode should be set to 1 in the p status "+
                       "register.");
    equals(cpu.p.m, 0, "The m flag of the p status register should be 0 for "+
                       "16-bit memory/accumulator mode.");
    equals(cpu.p.e, 0, "The hidden e flag of the p status register should "+
                       "be 0 for native mode.");
  });
}

function test_branching() {
  module("Branching");
  test("Test that BRA with 0x00 as its argument doesn't increment or "+
       "decrement the program counter", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("8000", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.pc, 0x8003, "Make sure that the program counter isn't "+
                             "incremented or decremented if BRA is given "+
                             "0x00 as its argument.");
  });

  test("Check that the branching operations properly treat the argument as "+
       "a two's complement number", function() {
    var cpu = new CPU_65816();
    // negative two's complement number 0xf0 = -16
    cpu.load_binary("80f0", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.pc, (0x8003-16), "A branching operation when given a "+
                                  "negative two's complement number should "+
                                  "decrement the program counter by the "+
                                  "proper amount.");
    cpu.reset();
    cpu.load_binary("8020", 0x8000); // positive two's complement number.
    cpu.execute(0x8000);
    equals(cpu.r.pc, (0x8003+0x20), "A branching operation when given a "+
                                    "positive two's complement number should "+
                                    "increment the program counter by the "+
                                    "proper amount.");
  });
  
  test("Check that BPL works as expected", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbc230a9fe7f1a10fd", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0x8000, "Check that branching only occurs while the "+
                            "number is a two's complement positive number.");
  });

  test("Check that BMI works as expected", function() {
    var cpu = new CPU_65816();
    cpu.load_binary("18fbc230a901803a30fd", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.r.a, 0x7fff, "Check that branching only occurs while the "+
                            "number is a two's complement negative number.");
  });
}

function test_sep() {
  module("SEP");
  test("Test 'SEP #$30' not in emulation mode", function() {
    var cpu = new CPU_65816();
    cpu.p.e = 0;
    cpu.load_binary("e230", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.p.m, 1, "'SEP #$30' should set the m status bit of the p "+
                       "register to 1");
    equals(cpu.p.x, 1, "'SEP #$30' should set the x status bit of the p "+
                       "register to 1");
    equals(cpu.p.n, 0, "'SEP #$30' should not set the n status bit of the p "+
                       "register to 1.");
    equals(cpu.p.c, 0, "'SEP #$30' should not set the c status bit of the p "+
                       "register to 1.");
    equals(cpu.p.z, 0, "'SEP #$30' should not set the z status bit of the p "+
                       "register to 1.");
    equals(cpu.p.d, 0, "'SEP #$30' should not set the d status bit of the p "+
                       "register to 1.");
    equals(cpu.p.v, 0, "'SEP #$30' should not set the v status bit of the p "+
                       "register to 1.");
    equals(cpu.p.i, 0, "'SEP #$30' should not set the i status bit of the p "+
                       "register to 1.");
  });
  test("Test 'SEP #$cf' not in emulation mode", function() {
    var cpu = new CPU_65816();
    cpu.p.e = 0;
    cpu.load_binary("e2cf", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.p.m, 0, "'SEP #$cf' should not set the m status bit of the p "+
                       "register to 1");
    equals(cpu.p.x, 0, "'SEP #$cf' should not set the x status bit of the p "+
                       "register to 1");
    equals(cpu.p.n, 1, "'SEP #$cf' should set the n status bit of the p "+
                       "register to 1.");
    equals(cpu.p.c, 1, "'SEP #$cf' should set the c status bit of the p "+
                       "register to 1.");
    equals(cpu.p.z, 1, "'SEP #$cf' should set the z status bit of the p "+
                       "register to 1.");
    equals(cpu.p.d, 1, "'SEP #$cf' should set the d status bit of the p "+
                       "register to 1.");
    equals(cpu.p.v, 1, "'SEP #$cf' should set the v status bit of the p "+
                       "register to 1.");
    equals(cpu.p.i, 1, "'SEP #$cf' should set the i status bit of the p "+
                       "register to 1.");
  });
}

function test_rep() {
  module("REP");
  test("Test 'REP #$30' not in emulation mode", function() {
    var cpu = new CPU_65816();
    cpu.p.e = 0;
    // Make sure stuff is cleared by setting all of the bits to 1 initially.
    cpu.p.n = 1;
    cpu.p.c = 1;
    cpu.p.v = 1;
    cpu.p.i = 1;
    cpu.p.d = 1;
    cpu.p.x = 1;
    cpu.p.m = 1;
    cpu.p.z = 1;
    cpu.load_binary("c230", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.p.m, 0, "'REP #$30' should clear the m bit of the p status "+
                       "register");
    equals(cpu.p.x, 0, "'REP #$30' should clear the x bit of the p status "+
                       "register");
    equals(cpu.p.d, 1, "'REP #$30' should not clear the d bit of the p "+
                       "status register");
    equals(cpu.p.i, 1, "'REP #$30' should not clear the i bit of the p "+
                       "status register");
    equals(cpu.p.c, 1, "'REP #$30' should not clear the c bit of the p "+
                       "status register");
    equals(cpu.p.z, 1, "'REP #$30' should not clear the z bit of the p "+
                       "status register");
    equals(cpu.p.v, 1, "'REP #$30' should not clear the v bit of the p "+
                       "status register");
    equals(cpu.p.n, 1, "'REP #$30' should not clear the n bit of the p "+
                       "status register");
  });

  test("Test 'REP #$cf' not in emulation mode", function() {
    var cpu = new CPU_65816();
    cpu.p.e = 0;
    // Make sure stuff is cleared by setting all of the bits to 1 initially.
    cpu.p.n = 1;
    cpu.p.c = 1;
    cpu.p.v = 1;
    cpu.p.i = 1;
    cpu.p.d = 1;
    cpu.p.x = 1;
    cpu.p.m = 1;
    cpu.p.z = 1;
    cpu.load_binary("c2cf", 0x8000);
    cpu.execute(0x8000);
    equals(cpu.p.m, 1, "'REP #$cf' should not clear the m bit of the p "+
                       "status register");
    equals(cpu.p.x, 1, "'REP #$cf' should not clear the x bit of the p "+
                       "status register");
    equals(cpu.p.z, 0, "'REP #$cf' should clear the z bit of the p status "+
                       "register");
    equals(cpu.p.n, 0, "'REP #$cf' should clear the n bit of the p status "+
                       "register");
    equals(cpu.p.d, 0, "'REP #$cf' should clear the d bit of the p status "+
                       "register");
    equals(cpu.p.v, 0, "'REP #$cf' should clear the v bit of the p status "+
                       "register");
    equals(cpu.p.i, 0, "'REP #$cf' should clear the i bit of the p status "+
                       "register");
    equals(cpu.p.c, 0, "'REP #$cf' should clear the c bit of the p status "+
                       "register");
  });
}
