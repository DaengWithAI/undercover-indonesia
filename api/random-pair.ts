
// Data kata langsung di dalam file untuk stabilitas Vercel
const WORDS = [
  {c:"S2VuZGFyYWFu",u:"VHJhbnNwb3J0YXNp"},{c:"TWFuaXNBTg==",u:"R3VyaWggU2Vka2l0"},{c:"UHVsb3Bpa2E=",u:"RHVuaWE="},{c:"QmF0ZHU=",u:"UGFzaXI="},{c:"UHVsb3Bp",u:"U2VndXJh"},{c:"U2VtYW5na2E=",u:"TWVsb24="},{c:"QXBlbA==",u:"UGVy"},{c:"U3RyYXdiZXJyaQ==",u:"Qmx1ZWJlcnJp"},
  {c:"UGlzYW5n",u:"UGFwYXlh"},{c:"QW5nZ3Vy",u:"TGVjaGk="},{c:"RG9yaWFu",u:"TuFuZ2th"},{c:"U2F5dXI=",u:"QnVhaA=="},{c:"V29ydGVs",u:"TG9iYWs="},{c:"QmF5YW0=",u:"S2Fua3VuZw=="},{c:"S2VudGFuZw==",u:"VWJp"},{c:"SmFndW5n",u:"R2FuZHVt"},
  {c:"TmFzaQ==",u:"TWll"},{c:"RGFnaW5n",u:"SWhhbg=="},{c:"QXlhbQ==",u:"QmVmZWs="},{c:"VGVsdXI=",u:"VGVmdQ=="},{c:"S2VkanU=",u:"TWVudGVnYQ=="},{c:"Q29rZWxhdA==",u:"VmFuaWxh"},{c:"UGVkYXM=",u:"QXNlbQ=="},{c:"TWFuaXM=",u:"R3VyaWg="},
  {c:"U2lydXA=",u:"SnVz"},{c:"S29waSBTdXN1",u:"TehIFN1c3U="},{c:"U29kYQ==",u:"QWlyIE1pbmVyYWw="},{c:"U2VwdXBy",u:"S2FzdXI="},{c:"TGVtYXJp",u:"UmFr"},{c:"Meph",u:"S3Vyc2k="},{c:"U29mYQ==",u:"QmFudGFs"},{c:"TGFtcHU=",u:"TGilin"},
  {c:"S2lwYXNBbmdpbg==",u:"QUM="},{c:"VFY=",u:"UHJveWVrdG9y"},{c:"S2Fsa3VsYXRvcg==",u:"U3RvcHdhdGNo"},{c:"UGVuZ2dhcmlz",u:"QnVzdXI="},{c:"S2FtdXM=",u:"RW5zaWtsb3BlZGlh"},{c:"S29yYW4=",u:"TWFqYWxhaA=="},{c:"UHVpc2k=",u:"UHJvc2E="},{c:"TGFrb24=",u:"RHJhbWE="},
  {c:"TXVzaWs=",u:"VGFyaQ=="},{c:"THVraXNhbg==",u:"UGF0dW5n"},{c:"V2FybmE=",u:"QmVudHVr"},{c:"R2FyaXM=",u:"VGl0aWs="},{c:"S290YWs=",u:"TGluZ2thcmFu"},{c:"U2VnaXRpZ2E=",u:"UGVyc2VnaQ=="},{c:"Qm9sYQ==",u:"UmFrZXQ="},{c:"U2VwYXsgQm9sYQ==",u:"QmFza2V0"},
  {c:"QnVsdSBUYW5naXM=",u:"VGVuaXM="},{c:"UmVuYW5n",u:"U2VsYW0="},{c:"THFyaQ==",u:"SmFsYW4="},{c:"U2VwZWRh",u:"U2thdGVib2FyZA=="},{c:"Q2F0dXI=",u:"S2FydHU="},{c:"R2FtZQ==",u:"TWFpbmFu"},{c:"Qm9uZWth",u:"Um9ib3Q="},{c:"TGF5YW5nbGF5YW5n",u:"QmFsb24="},
  {c:"VGFtYW4=",u:"SHV0YW4="},{c:"S2VidW4=",u:"U2F3YWg="},{c:"TGF1dA==",u:"U2FtdWRyYQ=="},{c:"UHVsYXU=",u:"QmVuZHVh"},{c:"RGVzYQ==",u:"S290YQ=="},{c:"TmVnYXJh",u:"UHJvdmluc2k="},{c:"UmFqYQ==",u:"UHJlc2lkZW4="},{c:"UmFreWF0",u:"V2FyZ2E="},
  {c:"VWFhbmc=",u:"RW1hcw=="},{c:"SGFyZ2E=",u:"TmlsYWk="},{c:"VG9rbw==",u:"S2FudG9y"},{c:"QmFua2E=",u:"S29wZXJhc2k="},{c:"U2Vrb2xhaA==",u:"S2FtcHVz"},{c:"S2VsYXM=",u:"S2FudGlu"},{c:"UGVycHVzdGFrYWFu",u:"TGFib3JhdG9yaXVt"},{c:"VHVnYXM=",u:"VWppYW4="},
  {c:"S2VyamE=",u:"TGidXI="},{c:"UGFnaQ==",u:"U29yZQ=="},{c:"U2lhbmc=",u:"TWFsYW0="},{c:"RGV0aWs=",u:"TWVuaXQ="},{c:"SmFt",u:"SGFyaQ=="},{c:"TWluZ2d1",u:"QnVsYW4="},{c:"VGFodW4=",u:"QWJhZA=="},{c:"TXVzaW1QYW5hcw==",u:"TXVzaW1IdWphbg=="},
  {c:"QW5naW4=",u:"QXNhaA=="},{c:"QXBp",u:"QWly"},{c:"VGFuYWg=",u:"QmF0dQ=="},{c:"UGFzaXI=",u:"THVtcHVy"},{c:"QmVzaQ==",u:"S2F5dQ=="},{c:"UGxhc3Rpaw==",u:"S2FjYQ=="},{c:"S2VydGFz",u:"S2Fpbg=="},{c:"QmVuYW5n",u:"VGFsaQ=="},
  {c:"SmFydW0=",u:"UGFrdQ=="},{c:"UGFsdQ==",u:"T2Jlbmc="},{c:"R2VyZ2FqaQ==",u:"R3VudGluZw=="},{c:"U2FwdQ==",u:"UGVs"},{c:"RW1iZXI=",u:"R2F5dW5n"},{c:"S2VyYW4=",u:"U2hvd2Vy"},{c:"S29tcG9y",u:"T3Vlbg=="},{c:"V2FqYW4=",u:"UGFuY2k="},
  {c:"S2VsaW5jaQ==",u:"SGFtc3Rlcg=="},{c:"QnVydW5n",u:"S2VsZWxhdmFy"},{c:"SWhhbkhpdQ==",u:"UGF1cw=="},{c:"THVtYmFsdW1iYQ==",u:"QW5qaW5nTGF1dA=="},{c:"S2F0YWs=",u:"S2FkYWw="},{c:"VWRhbmc=",u:"S2VwaXRpbmc="},{c:"TnltdWs=",u:"TGFsYXQ="},{c:"U2VtdXQ=",u:"TGFiYWxhYmE="},
  {c:"TWF0YQ==",u:"SGlkdW5n"},{c:"VGVsaW5nYQ==",u:"TXVsdXQ="},{c:"VGFuZ2Fu",u:"S2FraQ=="},{c:"SmFyaQ==",u:"TGlidGg="},{c:"R2lnaQ==",u:"R3VzaQ=="},{c:"UmFtYnV0",u:"QWxpcw=="},{c:"S2VwYWxh",u:"TGVoZXI="},{c:"RGFkYQ==",u:"UGVydXQ="},
  {c:"T3RhaQ==",u:"SmFudHVuZw=="},{c:"RGFyYWg=",u:"T3RvdA=="},{c:"U2FrdXQ=",u:"U2VoYXQ="},{c:"T2JhdA==",u:"Vml0YW1pbg=="},{c:"UnVtYWhTYmtpdA==",u:"UHVza2VzbWFz"},{c:"QW1idWxhbnM=",u:"TU9UT1JRTE5HQU5UClI="},{c:"U2Vsb2thbg==",u:"R290"},{c:"U2FtcGFo",u:"RGVidQ=="},
  {c:"QXNhaA==",u:"S2FidXQ="},{c:"UGVsYW5naQ==",u:"QXdhbg=="},{c:"QmludGFuZw==",u:"UGxhbmV0"},{c:"Um9rZXQ=",u:"U2F0ZWxpdA=="},{c:"R2VtcnBh",u:"VHN1bmFtaQ=="},{c:"QmFuamly",u:"TG9uZ3Nvci"},{c:"S2ViYWthcmFu",u:"TGVkYWthbg=="},{c:"S2VyZXRh",u:"VHJlbQ=="},
  {c:"U3Rhc2l1bg==",u:"VGVybWluYWw="},{c:"QmFuZGFyYQ==",u:"UGVsYWJ1aGFu"},{c:"SmVtYmF0YW4=",u:"VGVyb3dvbmdhbg=="},{c:"SmFsYW5SYXlh",u:"SmFsYW5Ub2w="},{c:"TGFtcHUgTWVyYWg=",u:"WmVicmFDcm9zcw=="},{c:"SGVsbQ==",u:"U2FidWtQZW5nYW1hbg=="},{c:"VGlrZXQ=",u:"UGFzcG9y"},{c:"S2FtYXI=",u:"UnVhbmdUYW11"},
  {c:"RGFwdXI=",u:"S2FtYXJNYW5kaQ=="},{c:"SmVuZGVsYQ==",u:"UGludHU="},{c:"VGFuZ2dh",u:"TGlmdA=="},{c:"UGFnYXI=",u:"VGVtYm9r"},{c:"SGFsYW1hbg==",u:"VGVyYXM="},{c:"R2VudGVuZw==",u:"S2VyYW1paw=="},{c:"THVraXNhbg==",u:"UG9zdGVy"},{c:"VmFz",u:"UG90"},
  {c:"QnVub2E=",u:"RGF1bg=="},{c:"QWakaTI=",u:"QmF0YW5n"},{c:"QmlqaQ==",u:"QnVhaA=="},{c:"S3VwdWt1cHU=",u:"Q2FwdW5n"},{c:"TGViYWg=",u:"VGF3b24="},{c:"VWxhcg==",u:"Q2FjaW5n"},{c:"VGlrdXM=",u:"VHVwYWk="},{c:"S3VyYWt1cmE=",u:"UGVueXU="},
  {c:"QnVhcmE=",u:"S29tb2Rv"},{c:"R3VyaXRh",u:"Q3VtaWN1bWk="},{c:"QmludGFuZ0xhdXQ=",u:"S3VkYUxhdXQ="},{c:"R3VsYQ==",u:"R2FyYW0="},{c:"TWVudGVnYQ==",u:"S2VkanU="},{c:"S2Fvc0xhbXB1",u:"TGFtcHVUaWR1cg=="},{c:"U2VtZW4=",u:"UGFzaXI="},{c:"QmVzaQ==",u:"QmFqYQ=="},
  {c:"U2ltcG9uaQ==",u:"T3JrZXN0cmE="},{c:"S29uc2VydA==",u:"RmVzdGl2YWw="},{c:"S29tcGl0ZXI=",u:"TGFwdG9w"},{c:"TW91c2U=",u:"S2VyYm9hcmQ="},{c:"U29mdHdhcmU=",u:"QXBsaWthc2k="},{c:"Q2xvdWQ=",u:"U2VydmVy"},{c:"U2lnbmFs",u:"V2lmaQ=="},{c:"SGVhZHBob25l",u:"U3BlYWtlcg=="},
  {c:"TWlrcm9mb24=",u:"UmVrb3JkZXI="},{c:"S2FkZWxkYXI=",u:"SmFtQWxhcm0="},{c:"U2VudGVy",u:"TGlsaW4="},{c:"RG9tcGV0",u:"S2FydHVLcmVkaXQ="},{c:"UGFzbHA=",u:"S29kZVBJTg=="},{c:"U2VsZmk=",u:"UG90cmV0"},{c:"RmlsdGVy",u:"RWRpdA=="},{c:"VmlkZW8=",u:"QW5pbWFzaQ=="},
  {c:"WW91VHViZQ==",u:"VGlrVG9r"},{c:"RmFjZWJvb2s=",u:"SW5zdGFncmFt"},{c:"V2hhdHNBcHA=",u:"VGVsZWdyYW0="},{c:"RW1haWw=",u:"U3VyYXQ="},{c:"UGFrZXQ=",u:"S3VyaXI="},{c:"TWFya2V0",u:"VG9rbw=="},{c:"RGlza29u",u:"UHJvbW8="},{c:"U3Rvaw==",u:"R3VkYW5n"},
  {c:"S3VsaW5lcg==",u:"TWFrYW5hbg=="},{c:"UmVzZXA=",u:"QmFodW4="},{c:"S29raQ==",u:"UGVsYXlhbg=="},{c:"UmVzdG9yYW4=",u:"V2FydW5n"},{c:"TWVudU==",u:"RGFmdGFy"},{c:"QmF5YXI=",u:"S2FzaXI="},{c:"Tm90YQ==",u:"UXVpdGFuc2k="},{c:"UGFqYWs=",u:"Q3VrYWk="},
  {c:"QXN1cmFuc2k=",u:"S2xhYmVsYQ=="},{c:"SW52ZXN0YXNp",u:"U2SahYW0="},{c:"TW9udW1lbg==",u:"TXVzZXVt"},{c:"Q2FuZGk=",u:"UHlyYW1pZA=="},{c:"S2FzdGls",u:"S2VyYXRvbg=="},{c:"UGV0YQ==",u:"R0xT"},{c:"Q29tcGFzcw==",u:"U2V4dGFu"},{c:"SmVuZGVsYQ==",u:"QmFsa29u"},
  {c:"QXByb24=",u:"U2Vyb2thbg=="},{c:"U2FtdXJhaQ==",u:"TmluamE="},{c:"S2F0YW5h",u:"UGVkYW5n"},{c:"UGVyaXNhaQ==",u:"WmlyaA=="},{c:"TWVyaWFt",u:"Qm9t"},{c:"UGVzd2F0VGVtcHVy",u:"S2FwYWxTZWxhbQ=="},{c:"U2VyYWdhbQ==",u:"QmF0aWs="},{c:"UHJhbXVrYQ==",u:"UE1S"},
  {c:"V2lzdWRh",u:"U2VydGlmaWthdA=="},{c:"Q2VsYW5h",u:"Um9r"},{c:"QmFqdQ==",u:"S2VtZWph"},{c:"U2VwYXR1",u:"U2FuZGFs"},{c:"VG9waQ==",u:"UXVpc2F0"},{c:"S2FjYW1hdGE=",u:"TGVuc2E="},{c:"SmFtVGFuZ2Fu",u:"Q2luY2lu"},{c:"RG9tcGV0",u:"VGFz"},
  {c:"UGFpay1wYWlr",u:"TWFuaXM="},{c:"QXNlbQ==",u:"QXNpbg=="},{c:"UGFiaXQ=",u:"R3VyaWg="},{c:"VmVzaQ==",u:"QmFqYQ=="},{c:"UGVyYWs=",u:"UGxhdGludW0="},{c:"RW1hcw==",u:"UGVybWF0YQ=="},{c:"S2VydGFz",u:"S2FydG9u"},{c:"UGFwYW4=",u:"VGFib3Q="},
  {c:"S2F5dQ==",u:"Um90YW4="},{c:"R2FtcGFuZw==",u:"U3VsaXQ="},{c:"Q2VwYXQ=",u:"TGFmYmF0"},{c:"S3VhdA==",u:"U2VreQ=="},{c:"QmVzaQ==",u:"S2F3YXQ="},{c:"S2FiZWw=",u:"VGFsaQ=="},{c:"UGFrdQ==",u:"QmF1dA=="},{c:"TWFydGls",u:"UGFsdQ=="},
  {c:"T2Jlbmc=",u:"S3VuY2k="},{c:"U2VwaXQ=",u:"TGViYXI="},{c:"VGFqYW0=",u:"VHVtcHVs"},{c:"QmVyc2lo",u:"S290b3I="},{c:"V2FuaQ==",u:"VGFrdXQ="},{c:"U2VuYW5n",u:"U2VkaWg="},{c:"TWFyYWg=",u:"SGVyYW4="},{c:"VGlkdXI=",u:"QmFuZ3Vu"},
  {c:"TWFrYW4=",u:"TWludW0="},{c:"SmFsYW4=",u:"TGFyaQ=="},{c:"TG9tcGF0",u:"VGVyYmFuZw=="},{c:"SmF0dWg=",u:"VGVycGxlc2V0"},{c:"R3VudW5n",u:"TGVmYmFo"},{c:"U3VuZ2Fp",u:"RGFuYXU="},{c:"UGFudGFp",u:"UHVsYXU="},{c:"QXdhbg==",u:"TWF0YWhhcmk="},
  {c:"QnVsYW4=",u:"QmludGFuZw=="},{c:"R2VsYXA=",u:"VGVyYW5n"},{c:"UGFuYXM=",u:"RGluZ2lu"},{c:"QmFzYWg=",u:"S2VyaW5n"},{c:"S2FzYXI=",u:"SGFsdXM="},{c:"VHVh",u:"TXVkYQ=="},{c:"UmFtYWk=",u:"U2VwaQ=="},{c:"S2F5YQ==",u:"TWlza2lu"},
  {c:"UGFudGlh",u:"Qm9kb2g="},{c:"SmF1aA==",u:"RGVsa2F0"},{c:"VGlmZ2dp",u:"UmVuZGFo"},{c:"QmVzYXI=",u:"S2VjaWw="},{c:"UGFuamFuZw==",u:"UGVuZGVr"},{c:"QmVyYXQ=",u:"UmluZ2Fu"},{c:"S2VyYXM=",u:"RW1wdWs="},{c:"V2FuZ2k=",u:"QmF1"},
  {c:"U3VhcmE=",u:"R2VtYQ=="},{c:"R2VsYXA=",u:"UmVkdXA="},{c:"UmFwaQ==",u:"QmVyYW50YWthbg=="},{c:"U29wYW4=",u:"S2FzYXI="},{c:"SnVqdXI=",u:"Qm9ob25n"},{c:"U2FiYXI=",u:"RW1vc2k="},{c:"UmFqaW4=",u:"TWFsYXM="},{c:"QmVyYW5p",u:"UGVuYWt1dA=="},
  {c:"UGFudGFp",u:"UGVzaXNpcg=="},{c:"S2FwaXRhbA==",u:"SHVydWY="},{c:"QW5na2E=",u:"U2ltYm9s"},{c:"VGl0aWs=",u:"S29tYQ=="},{c:"VGFueWE=",u:"U2VydU=="},{c:"QnVrdQ==",u:"TGVtYmFyYW4="},{c:"UGVuc2ls",u:"UHVscGVu"},{c:"S2FwdXI=",u:"U3BpZG9s"},
  {c:"UGFwYW5UdWxpcw==",u:"TGFreWly"},{c:"R3VkYW5n",u:"TG9reWly"},{c:"U2F0cG9s",u:"U2VjdXJpdHk="},{c:"U29waXJh",u:"TWFzaW5pcw=="},{c:"UGlsb3Q=",u:"TmFrb2Rh"},{c:"TmVseWFu",u:"UGV0YW5p"},{c:"UGVkaWdhdyA=",u:"UGVuZ2FwaXQ="},{c:"QXJzaXRlaw==",u:"RGVzYWluZXI="},
  {c:"UGVub2xpcw==",u:"V2FydGF3YW4="},{c:"TW9kZWw=",u:"QXJ0aXM="},{c:"UHV0cmE=",u:"UHV0cmi="},{c:"QmF5YXI=",u:"QmFsaXRh"},{c:"UmVtYWph",u:"RGV3YXNh"},{c:"T3JhbmdUdWE=",u:"TWVydWF0YQ=="},{c:"S2FrZWs=",u:"TmVuZWs="},{c:"U2F1ZGFyYQ==",u:"VGVtYW4="},
  {c:"TXVzdWg=",u:"U2FoYWJhdA=="},{c:"VGV0YW5nZ2E=",u:"T3JhbmfMYWlu"},{c:"UGFzdWthbg==",u:"UmVndQ=="},{c:"UGVtZXJpbnRhaA==",u:"RGV3YW4="},{c:"TWFqaWxpcz=",u:"UGFydGFp"},{c:"SHVrdW0=",u:"QWRhdA=="},{c:"SmFsYW4=",u:"QmVudHVr"},{c:"S29sb20=",u:"QmFyaXM="},
  {c:"VGFib2Vs",u:"R3JhZmlr"},{c:"RGF0YQ==",u:"RmFrdGE="},{c:"QmVyaXRh",u:"UnVtb3I="},{c:"Q2VyaXRh",u:"RG9uZyVlbmc="},{c:"T3BlcmE=",u:"S2V0b3ByYWs="},{c:"V2F5YW5n",u:"Qm9uZGVr"},{c:"RGFpZ2E=",u:"UHVwZXQ="},{c:"S2Fybml2YWw=",u:"UGFyYWRl"},
  {c:"SGFkaWFo",u:"Qm9udXM="},{c:"TWVkYWxp",u:"UGlhbGE="},{c:"QWxsYmg=",u:"VHVrYW5n"},{c:"T3Jhbmc=",u:"TWFudXNpYQ=="},{c:"SGlkdXA=",u:"TWF0aQ=="},{c:"TGFoaXI=",u:"V3VqdWQ="},{c:"Um9o",u:"Sml3YQ=="},{c:"UGlraXJhbg==",u:"UGVyYXNhYW4="},
  {c:"TWltcGk=",u:"SGF5YWxhbg=="},{c:"TmFmYXN1",u:"S2VpbmdpbmFu"},{c:"Q2ludGE=",u:"U2F5YW5n"},{c:"QmVuY2k=",u:"RGVuZGFt"},{c:"TWFsdQ==",u:"QmFuZ2dh"},{c:"U2VkZWlo",u:"R2VtYmlyYQ=="},{c:"S2F3YW4=",u:"T3JhbmfBY3ZhbA=="},{c:"UGVtb25n",u:"UGVubG9uZw=="},
  {c:"UGVsYXly",u:"UGVuZ29uZw=="},{c:"QmFja2VuZA==",u:"RnJvbnRlbmQ="},{c:"S29kZQ==",u:"U2NyaXB0"},{c:"QnVn",u:"RXJyb3I="},{c:"RGF0YWJhc2U=",u:"U3RvcmFnZQ=="},{c:"U2VydmVy",u:"SG9zdGluZw=="},{c:"RG9tYWlu",u:"SFA="},{c:"QWtrdW50",u:"UHJvZmls"},{c:"UGFzc3dvcmQ=",u:"VXNlcm5hbWU="},
  {c:"TG9naW4=",u:"UmVnaXN0ZXI="},{c:"S2xpaw==",u:"V2lwZQ=="},{c:"U2Nyb2xs",u:"R3VsdW5n"},{c:"SGludA==",u:"U29sdXNp"},{c:"S29udGVu",u:"SWRl"},{c:"VmlyYWw=",u:"VHJlbmRpbmc="},{c:"SGFzaHRhZw==",u:"TGluaw=="},{c:"U2hhcmU=",u:"UG9zdA=="},
  {c:"Q29tbWVudA==",u:"UmVwbHk="},{c:"TGlrZQ==",u:"RmF2b3JpdGU="},{c:"U3Vic2NyaWJl",u:"Rm9sbG93"},{c:" Tm90aWZpa2FzaQ==",u:"UGVzYW4="},{c:"Q2hhdA==",u:"T2Jyb2xhbg=="},{c:"R3J1cA==",u:"S29tdW5pdGFz"},{c:"RXZlbnQ=",u:"QWNhcmE="},{c:"SWRlbnRpdGFz",u:"UmFmYXNp"},
  {c:"S2VydHVraQ==",u:"S1RQ"},{c:"U0lN",u:"U1RLTgo="},{c:"UGFzcG9ydA==",u:"VmlzYQ=="},{c:"RG9rdW1lbnQ=",u:"QXJzaXA="},{c:"Rm90bw==",u:"R2FtYmFy"},{c:"S2FtZXJh",u:"THVyc2E="},{c:"TGVuc2E=",u:"Ymlub2tlbGFy"},{c:"TWlrcm9za29w",u:"VGVsZXNrb3A="},
  {c:"UmFkaW8=",u:"UG9kY2FzdA=="},{c:"QWlycGhvbmU=",u:"Qmx1ZXRvb3Ro"},{c:"QmF0ZXJhaQ==",u:"Q2hhcmdlcg=="},{c:"S2FiZWxVU0I=",u:"QWRhcHRlcg=="},{c:"S2lwYXNBbmdpbg==",u:"VmVudGlsYXNp"},{c:"SmVuZGVsYQ==",u:"RmVudGlsYXM="},{c:"QXRhcA==",u:"UGxhZm9uZA=="},{c:"TGFudGFp",u:"UGFya2V0"},
  {c:"S2VyYW1paw==",u:"TWFybWVy"},{c:"VGVtYm9r",u:"U3VrYXQ="},{c:"Q2F0",u:"V2FsbHBhcGVy"},{c:"UGF0dW5n",u:"UmVsaWVm"},{c:"QW5p",u:"S2Vsb3Bhaw=="},{c:"UHV0aWs=",u:"QmVuYW5nU2FyaQ=="},{c:"VGFuYW1hbg==",u:"UmVtcGFo"},{c:"SmFtdQ==",u:"SGVyYmFs"},
  {c:"UmVtcGFo",u:"S2VkaXJh"},{c:"Q2FpYmU=",u:"TGFkYQ=="},{c:"SmFl",u:"S3VueWl0"},{c:"QmF3YW5n",u:"U2VsZW5n"},{c:"R2FyYW0=",u:"TWljaW4="},{c:"R3VsYQ==",u:"TWFkdQ=="},{c:"TWluemFr",u:"U2FudGFu"},{c:"VGVwdW5n",u:"U2FndQ=="},
  {c:"Um90aQ==",u:"RG9uYXQ="},{c:"Q2FrZQ==",u:"QnJvd25pZXM="},{cpx:"UGVybWVu",u:"Q29rZWxhdA=="},{c:"RXNLcmlt",u:"R2VsYXRv"},{c:"SnVz",u:"U21vb3RoaWU="},{c:"S29waQ==",u:"RXNwcmVzc28="},{c:"TGF0dGU=",u:"Q2FwcHVjY2lubw=="},{c:"TW9jaGE=",u:"Q2FyYW1lbA=="},
  {c:"UHVkaW5n",u:"SmVsbHk="},{c:"U2FsYWQ=",u:"U3Vw"},{c:"U290bw==",u:"UmF3b24="},{c:"U2F0ZQ==",u:"R3VsYWk="},{c:"UmVuZGFuZw==",u:"T3Bvcg=="},{c:"QmFrbm8=",u:"U2lzaQ=="},{c:"U2lvbWF5",u:"QmF0YWdvcg=="},{c:"UGVtcmVr",u:"T3Rha290YWs="}
];

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json");

  try {
    const decode = (s) => Buffer.from(s, "base64").toString("utf8");
    const randomIndex = Math.floor(Math.random() * WORDS.length);
    const pair = WORDS[randomIndex];

    return res.status(200).json({
      civilian: decode(pair.c),
      undercover: decode(pair.u),
      totalPairs: WORDS.length
    });
  } catch (err) {
    return res.status(500).json({ error: "Gagal mengambil data" });
  }
}
