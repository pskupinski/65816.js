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
  test("Test 'SEP #$30'", function() {
    var cpu = new CPU_65816();
    SEP.execute(cpu, [0x30]);
    equals(cpu.p.m, 1, "'SEP #$30' should set the m status bit of the p "+
                       "register to 1");
    equals(cpu.p.x, 1, "'SEP #$30' should set the x status bit of the p "+
                       "register to 1");
  });
}

function test_rep() {
  module("REP");
  test("Test 'REP #$30'", function() {
    var cpu = new CPU_65816();
    cpu.p.m = 1;
    cpu.p.x = 1;
    REP.execute(cpu, [0x30]); 
    equals(cpu.p.m, 0, "'REP #$30' should set the m status bit of the p "+
                       "register to 0");
    equals(cpu.p.x, 0, "'REP #$30' should set the x status bit of the p "+
                       "register to 0");
  });
}
