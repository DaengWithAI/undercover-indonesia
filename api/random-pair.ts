
// Data kata yang sudah di-obfuscate (Base64)
const WORDS = [
  { c: "U2VwZWRh", u: "TW90b3I=" },
  { c: "QnVhaA==", u: "U2F5dXI=" },
  { c: "S3Vyc2k=", u: "TWVqYQ==" },
  { c: "TGFtcHU=", u: "TGlsaW4=" },
  { c: "S2FzdXI=", u: "U29mYQ==" },
  { c: "QmFudGFs", u: "R3VsaW5n" },
  { c: "TmFzaQ==", u: "TWll" },
  { c: "QXlhbQ==", u: "QmVmZWs=" },
  { c: "S29waQ==", u: "VGVo" },
  { c: "U3VzdQ==", u: "U2lydXA=" },
  { c: "V29ydGVs", u: "TG9iYWs=" },
  { c: "QXBlbA==", u: "UGVy" },
  { c: "SmVydWs=", u: "TW9uZ2dh" },
  { c: "U2VtYW5na2E=", u: "TWVsb24=" },
  { c: "RG9yaWFu", u: "TuFuZ2th" },
  { c: "UGlzYW5n", u: "UGFwYXlh" },
  { c: "QmF5YW0=", u: "S2Fua3VuZw==" },
  { c: "S2VudGFuZw==", u: "VWJp" },
  { c: "VGVsdXI=", u: "VGVmdQ==" },
  { c: "S2VkanU=", u: "TWVudGVnYQ==" },
  { c: "UGVkYXM=", u: "QXNlbQ==" },
  { c: "TWFuaXM=", u: "R3VyaWg=" },
  { c: "S2FtdXM=", u: "RW5zaWtsb3BlZGlh" },
  { c: "U2Vrb2xhaA==", u: "S2FtcHVz" },
  { c: "R3VydQ==", u: "RG9zZW4=" },
  { c: "RG9rdGVy", u: "UGVyYXdhdA==" },
  { c: "UG9saXNp", u: "VGVudGFyYQ==" },
  { c: "U2VwYXsgQm9sYQ==", u: "QmFza2V0" },
  { c: "UmVuYW5n", u: "U2VsYW0=" },
  { c: "TGF1dA==", u: "U2FtdWRyYQ==" },
  { c: "R3VudW5n", u: "QnVraXQ=" },
  { c: "SHV0YW4=", u: "VGFtYW4=" },
  { c: "RGVzYQ==", u: "S290YQ==" },
  { c: "UmFqYQ==", u: "UHJlc2lkZW4=" },
  { c: "VWFhbmc=", u: "RW1hcw==" },
  { c: "S2VyamE=", u: "TGidXI=" },
  { c: "RGV0aWs=", u: "TWVuaXQ=" },
  { c: "SmFt", u: "SGFyaQ==" },
  { c: "TWluZ2d1", u: "QnVsYW4=" },
  { c: "QmVzaQ==", u: "S2F5dQ==" },
  { c: "UGxhc3Rpaw==", u: "S2FjYQ==" },
  { c: "S2VydGFz", u: "S2Fpbg==" },
  { c: "U2FwdQ==", u: "UGVs" },
  { c: "RW1iZXI=", u: "R2F5dW5n" },
  { c: "S2VsaW5jaQ==", u: "SGFtc3Rlcg==" },
  { c: "QnVydW5n", u: "S2VsZWxhdmFy" },
  { c: "S2F0YWs=", u: "S2FkYWw=" },
  { c: "TWF0YQ==", u: "SGlkdW5n" },
  { c: "VGVsaW5nYQ==", u: "TXVsdXQ=" },
  { c: "VGFuZ2Fu", u: "S2FraQ==" },
  { c: "R2lnaQ==", u: "R3VzaQ==" },
  { c: "T2JhdA==", u: "Vml0YW1pbg==" },
  { c: "U2FtcGFo", u: "RGVidQ==" },
  { c: "UGVsYW5naQ==", u: "QXdhbg==" },
  { c: "QmludGFuZw==", u: "UGxhbmV0" },
  { c: "QmFuamly", u: "TG9uZ3Nvci" },
  { c: "S2VyZXRh", u: "VHJlbQ==" },
  { c: "U3Rhc2l1bg==", u: "VGVybWluYWw=" },
  { c: "QmFuZGFyYQ==", u: "UGVsYWJ1aGFu" },
  { c: "VGlrZXQ=", u: "UGFzcG9y" },
  { c: "UGludHU=", u: "SmVuZGVsYQ==" },
  { c: "VGFuZ2dh", u: "TGlmdA==" },
  { c: "UGFnYXI=", u: "VGVtYm9r" },
  { c: "S3VwdS1rdXB1", u: "Q2FwdW5n" },
  { c: "TGViYWg=", u: "VGF3b24=" },
  { c: "VWxhcg==", u: "Q2FjaW5n" },
  { c: "R3VsYQ==", u: "R2FyYW0=" },
  { c: "U2lnbmFs", u: "V2lmaQ==" },
  { c: "RW1haWw=", u: "U3VyYXQ=" },
  { c: "RGlza29u", u: "UHJvbW8=" },
  { c: "U2FtdXJhaQ==", u: "TmluamE=" }
];

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  
  try {
    const randomIndex = Math.floor(Math.random() * WORDS.length);
    const pair = WORDS[randomIndex];
    
    const decode = (s) => Buffer.from(s, "base64").toString("utf8");

    res.status(200).json({
      civilian: decode(pair.c),
      undercover: decode(pair.u)
    });
  } catch (err) {
    res.status(500).json({ error: "Internal Error" });
  }
}
