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
  test_rep();
  test_sep();
  test_branching();
  test_adc();
}

function test_adc() {
  module("ADC");
  // TODO: signed overflow testing.
  test("Test normal addition of two 16-bit numbers that don't cause an "+
       "overflow (m bit is 0)", function() {
     var cpu = new CPU_65816();
     cpu.execute("18fb18c230a90100690100");
     equals(cpu.r.a, 2, "0x0001 + 0x0001 should result in 0x0002 when using "+
                        "ADC");
     equals(cpu.p.n, 0, "0x0001 + 0x0001 does not result in a negative "+
                        "two's complement number when adding with ADC."); 
     equals(cpu.p.c, 0, "0x0001 + 0x0001 should not set the carry(c) bit when "+
                        "adding with ADC");
     equals(cpu.p.z, 0, "0x0001 + 0x0001 should not set the zero(z) bit when "+
                        "adding with ADC");
   });
   test("Test normal addition of two 8-bit numbers that don't cause an "+
       "overflow (m bit is 1)", function() {
     var cpu = new CPU_65816();
     cpu.execute("18fb18e230a9016901");
     equals(cpu.r.a, 2, "0x01 + 0x01 should result in 0x02 when using "+
                        "ADC");
     equals(cpu.p.n, 0, "0x01 + 0x01 does not result in a negative "+
                        "two's complement number when adding with ADC."); 
     equals(cpu.p.c, 0, "0x01 + 0x01 should not set the carry(c) bit when "+
                        "adding with ADC");
     equals(cpu.p.z, 0, "0x01 + 0x01 should not set the zero(z) bit when "+
                        "adding with ADC");
   });
  
  test("Test that overflow sets the carry flag and works in general with two"+
       "16-bit numbers (m bit is 0)", function() {
    var cpu = new CPU_65816();
    cpu.execute("18fb18c230a9ffff690100");
    equals(cpu.p.c, 1, "0xffff + 0x0001 should set the carry bit when using "+
                       "ADC");
    equals(cpu.r.a, 0, "0xffff + 0x0001 should result in the accumulator "+
                       "being 0 when using ADC");
    equals(cpu.p.n, 0, "0xffff + 0x0001 should not set the negative(n) bit "+
                       "when using ADC");
    equals(cpu.p.z, 1, "0xffff + 0x0001 should set the zero(z) bit when using "+
                       "ADC");
  });

  test("Test that overflow sets the carry flag and works in general with two"+
       "8-bit numbers (m bit is 1)", function() {
    var cpu = new CPU_65816();
    cpu.execute("18fb18e230a9ff6901");
    equals(cpu.p.c, 1, "0xff + 0x01 should set the carry bit when using "+
                       "ADC");
    equals(cpu.r.a, 0, "0xff + 0x01 should result in the accumulator "+
                       "being 0 when using ADC");
    equals(cpu.p.n, 0, "0xff + 0x01 should not set the negative(n) bit when "+
                       "using ADC");
    equals(cpu.p.z, 1, "0xff + 0x01 should set the zero(z) bit when using "+
                       "ADC");
  });
}

function test_branching() {
  module("Branching");
  test("Test that BRA with 0x00 as its argument doesn't increment or "+
       "decrement the program counter", function() {
    var cpu = new CPU_65816();
    cpu.execute("8000");
    // NOTE: 0x8003 is subject to change however I decide to lay out memory
    // eventually.
    equals(cpu.r.pc, 0x8003, "Make sure that the program counter isn't "+
                             "incremented or decremented if BRA is given "+
                             "0x00 as its argument.");
  });

  test("Check that the branching operations properly treat the argument as "+
       "a two's complement number", function() {
    var cpu = new CPU_65816();
    cpu.execute("80f0"); // negative two's complement number 0xf0 = -16
    equals(cpu.r.pc, (0x8003-16), "A branching operation when given a "+
                                  "negative two's complement number should "+
                                  "decrement the program counter by the "+
                                  "proper amount.");    
    cpu.execute("8020"); // positive two's complement number.
    equals(cpu.r.pc, (0x8003+0x20), "A branching operation when given a "+
                                    "positive two's complement number should "+
                                    "increment the program counter by the "+
                                    "proper amount.");
  });
  
  test("Check that BPL works as expected", function() {
    var cpu = new CPU_65816();
    cpu.execute("18fbc230a9fe7f1a10fd");
    equals(cpu.r.a, 0x8000, "Check that branching only occurs while the "+
                            "number is a two's complement positive number.");
  });

  test("Check that BMI works as expected", function() {
    var cpu = new CPU_65816();
    cpu.execute("18fbc230a901803a30fd");
    equals(cpu.r.a, 0x7fff, "Check that branching only occurs while the "+
                            "number is a two's complement negative number.");
  });
}

function test_sep() {
  module("SEP");
  test("Test 'SEP #$30' not in emulation mode", function() {
    var cpu = new CPU_65816();
    cpu.p.e = 0;
    cpu.execute("e230");
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
    cpu.execute("e2cf"); 
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
    cpu.execute("c230");
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
    cpu.execute("c2cf");
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
