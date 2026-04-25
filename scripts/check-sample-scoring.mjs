const txt = process.env.TSV ?? "";
const lines = txt.trim().split(/\r?\n/);
const mism = [];

for (let i = 1; i < lines.length; i += 1) {
  const c = lines[i].split("\t");
  if (c.length < 20) continue;
  const s1 = Number(c[2]);
  const s2 = Number(c[5]);
  const m1 = Number(c[7]);
  const m2 = Number(c[8]);
  const m3 = Number(c[9]);
  const m4 = Number(c[10]);
  const expEq1 = Number(c[16]);
  const expEq2 = Number(c[19]);
  if (!Number.isFinite(s1) || !Number.isFinite(s2)) continue;

  let got1 = 0;
  let got2 = 0;
  if (s1 !== s2 && Math.max(s1, s2) === 40) {
    const eq1wins = s1 > s2;
    const maikaEq1 = m1 + m2;
    const maikaEq2 = m3 + m4;
    const maikaWinner = eq1wins ? maikaEq1 : maikaEq2;
    const maikaLoser = eq1wins ? maikaEq2 : maikaEq1;
    const oppMinusWin = maikaLoser - maikaWinner;
    const winMinusLose = maikaWinner - maikaLoser;
    const winPts = oppMinusWin >= 2 ? 5 : oppMinusWin >= 1 ? 4 : oppMinusWin >= 0 ? 3 : 2;
    const losePts = winMinusLose > 0 ? -1 : winMinusLose > -1 ? -2 : winMinusLose >= -2 ? -3 : -4;
    const loserScore = eq1wins ? s2 : s1;
    const off = loserScore < 29 ? 1 : 0;
    const def = loserScore >= 36 ? 1 : 0;
    got1 = eq1wins ? winPts + off : losePts + def;
    got2 = eq1wins ? losePts + def : winPts + off;
  }

  if (got1 !== expEq1 || got2 !== expEq2) {
    mism.push({
      row: i,
      eq1: `${c[0]}/${c[1]}`,
      eq2: `${c[3]}/${c[4]}`,
      score: `${s1}-${s2}`,
      exp: `${expEq1}/${expEq2}`,
      got: `${got1}/${got2}`,
    });
  }
}

console.log("rows", Math.max(lines.length - 1, 0), "mismatches", mism.length);
for (const m of mism) {
  console.log(`${m.row}\t${m.eq1} vs ${m.eq2}\t${m.score}\texp ${m.exp}\tgot ${m.got}`);
}
