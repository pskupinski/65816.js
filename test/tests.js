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
