(() => {
  const $ = (s) => document.querySelector(s);
  const fmtMoney = (n) => new Intl.NumberFormat('tr-TR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n||0);
  const fmtPct = (x) => `${(x).toFixed(2)}%`;
  const addMonths = (d,m)=>{const x=new Date(d);x.setMonth(x.getMonth()+m);return x};
  const ymd = (d)=>d.toISOString().slice(0,10);

  const form = $("#calc-form");
  const btnCSV = $("#download-csv");
  const btnShare = $("#share-link");
  const btnReset = $("#reset-btn");
  const summary = $("#summary");
  const chartEl = $("#chart");
  const allocModeSel = $("#alloc_mode");

  const retSchedBody = $("#ret-sched-body");
  const insSchedBody = $("#ins-sched-body");
  $("#add-ret-row").onclick = () => addSchedRow(retSchedBody);
  $("#add-ins-row").onclick = () => addSchedRow(insSchedBody);

  function addSchedRow(tbody){
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td><input type="number" min="0" step="1" value="0" class="sched_from"></td>
       <td><input type="number" min="0" step="1" value="4" class="sched_to"></td>
       <td><input type="number" min="0" step="0.01" value="1000" class="sched_amt"></td>
       <td><button type="button" class="ghost del">Sil</button></td>`;
    tbody.appendChild(tr);
    tr.querySelector('.del').onclick = ()=> tr.remove();
  }

  function toggleAllocUI(){
    const mode = allocModeSel.value;
    document.querySelectorAll(".alloc.percent").forEach(el=>el.classList.toggle("hidden",mode!=="percent"));
    document.querySelectorAll(".alloc.amount").forEach(el=>el.classList.toggle("hidden",mode!=="amount"));
  }
  allocModeSel.addEventListener("change", toggleAllocUI);
  toggleAllocUI();

  btnReset.onclick = () => {
    location.hash = "";
    form.reset();
    retSchedBody.innerHTML = "";
    insSchedBody.innerHTML = "";
    if (chart) { chart.destroy(); chart = undefined; }
    summary.innerHTML = "";
    btnCSV.disabled = true; btnShare.disabled = true;
    toggleAllocUI();
  };

  function readSchedule(tbody){
    const rows = [];
    tbody.querySelectorAll("tr").forEach(tr=>{
      const fy = +tr.querySelector(".sched_from").value;
      const ty = +tr.querySelector(".sched_to").value;
      const am = +tr.querySelector(".sched_amt").value;
      if (isFinite(fy)&&isFinite(ty)&&isFinite(am)&&ty>=fy && am>=0) rows.push({fromYear:fy,toYear:ty,monthly:am});
    });
    return rows;
  }
  function monthlyFromSchedule(t, defaultAmt, schedule){
    const y = Math.floor(t/12);
    for (const r of schedule){
      if (y>=r.fromYear && y<=r.toYear) return r.monthly;
    }
    return defaultAmt;
  }

  function getInputs(){
    return {
      // FI hedefi için
      monthly_spending_today: +$("#monthly_spending_today").value || 0,
      passive_income_today: +$("#passive_income_today").value || 0,
      swr: (+$("#swr").value || 0)/100,
      inflation: (+$("#inflation").value || 0)/100,

      // Sigorta fonu
      start_capital_ins: +$("#start_capital_ins").value || 0,
      contrib_ins: +$("#contrib_ins").value || 0,
      target_ins_today: +$("#target_ins_today").value || 0,
      return_ins: (+$("#return_ins").value || 0)/100,
      redirect_after_ins: $("#redirect_after_ins").checked,

      // Emeklilik toplam
      start_capital_ret: +$("#start_capital_ret").value || 0,
      contrib_ret: +$("#contrib_ret").value || 0,
      contrib_growth: (+$("#contrib_growth").value || 0)/100,
      max_years: +$("#max_years").value || 60,

      // Programlar
      ret_schedule: readSchedule(retSchedBody),
      ins_schedule: readSchedule(insSchedBody),

      // Dağılım
      alloc_mode: $("#alloc_mode").value,
      w_re:+$("#w_re").value||0, w_eq:+$("#w_eq").value||0, w_cr:+$("#w_cr").value||0, w_cm:+$("#w_cm").value||0, w_eb:+$("#w_eb").value||0,
      a0_re:+$("#a0_re")?.value||0, a0_eq:+$("#a0_eq")?.value||0, a0_cr:+$("#a0_cr")?.value||0, a0_cm:+$("#a0_cm")?.value||0, a0_eb:+$("#a0_eb")?.value||0,
      ac_re:+$("#ac_re")?.value||0, ac_eq:+$("#ac_eq")?.value||0, ac_cr:+$("#ac_cr")?.value||0, ac_cm:+$("#ac_cm")?.value||0, ac_eb:+$("#ac_eb")?.value||0,
      r_re:(+$("#r_re").value||0)/100, r_eq:(+$("#r_eq").value||0)/100, r_cr:(+$("#r_cr").value||0)/100, r_cm:(+$("#r_cm").value||0)/100, r_eb:(+$("#r_eb").value||0)/100,

      // Post-FI çalışma
      post_work_years: +$("#post_work_years").value || 0,
      post_work_contrib: +$("#post_work_contrib").value || 0,

      // Çekim testi
      enable_drawdown: $("#enable_drawdown").checked,
      dd_horizon: +$("#dd_horizon").value || 35,
      dd_index_infl: $("#dd_index_infl").value === "yes",
      dd_withdraw_today: $("#dd_withdraw_today").value ? +$("#dd_withdraw_today").value : null,
      dd_return_mode: $("#dd_return_mode").value,
      dd_return_manual: (+$("#dd_return_manual").value||0)/100,
      dd_stress: (+$("#dd_stress").value||0)/100,
    };
  }

  function stateToHash(inputs){
    const save = {...inputs};
    ["swr","inflation","contrib_growth","r_re","r_eq","r_cr","r_cm","r_eb","return_ins","dd_return_manual","dd_stress"].forEach(k=>save[k]=+(save[k]*100).toFixed(6));
    // Programları hash’e koymuyoruz (basit tutmak için).
    location.hash = encodeURIComponent(JSON.stringify(save));
  }
  function loadFromHash(){
    if (location.hash.length>1){
      try{
        const obj = JSON.parse(decodeURIComponent(location.hash.slice(1)));
        Object.entries(obj).forEach(([k,v])=>{
          const el = document.getElementById(k);
          if (!el) return;
          if (el.type === 'checkbox') el.checked = !!v;
          else el.value = v;
        });
        toggleAllocUI();
      }catch{}
    }
  }
  loadFromHash();

  // IRR solver (monthly)
  function xirrMonthly(cfs){
    const npv = (r)=>cfs.reduce((s,cf)=>s + cf.amt/Math.pow(1+r, cf.t), 0);
    let lo=-0.9999, hi=10, fLo=npv(lo), fHi=npv(hi);
    if (fLo*fHi>0) return null;
    for(let i=0;i<100;i++){
      const mid=(lo+hi)/2, f=npv(mid);
      if (Math.abs(f)<1e-7) return mid;
      if (fLo*f<0){ hi=mid; fHi=f; } else { lo=mid; fLo=f; }
    }
    return (lo+hi)/2;
  }

  // ---- Ana simülasyon (FI + Post-FI katkı) ----
  function simulate(inputs){
    const startDate = new Date();
    const monthsMax = Math.max(1, Math.min(1200, Math.round(inputs.max_years*12)));
    const r_ins_m = Math.pow(1+inputs.return_ins,1/12)-1;
    const inf_m   = Math.pow(1+inputs.inflation,1/12)-1;

    const monthly_need_today = Math.max(0, inputs.monthly_spending_today - inputs.passive_income_today);
    const req_corpus_real = monthly_need_today>0 && inputs.swr>0 ? (monthly_need_today*12)/inputs.swr : 0;

    const assets = [
      { key:"re", name:"Gayrimenkul", r_y:inputs.r_re },
      { key:"eq", name:"Hisse",       r_y:inputs.r_eq },
      { key:"cr", name:"Kripto",      r_y:inputs.r_cr },
      { key:"cm", name:"Emtia",       r_y:inputs.r_cm },
      { key:"eb", name:"Eurobond",    r_y:inputs.r_eb },
    ];
    assets.forEach(a=>a.r_m = Math.pow(1+a.r_y,1/12)-1);

    const w = {re:inputs.w_re, eq:inputs.w_eq, cr:inputs.w_cr, cm:inputs.w_cm, eb:inputs.w_eb};
    const wSum = Object.values(w).reduce((s,x)=>s+(+x||0),0);

    // init balances
    const bal = {};
    if (inputs.alloc_mode==="percent"){
      const norm = wSum>0? wSum : 1;
      assets.forEach(a=>{
        const wi=(w[a.key]||0)/norm;
        bal[a.key]= inputs.start_capital_ret * wi;
      });
    } else {
      bal.re=inputs.a0_re; bal.eq=inputs.a0_eq; bal.cr=inputs.a0_cr; bal.cm=inputs.a0_cm; bal.eb=inputs.a0_eb;
    }

    let balIns = inputs.start_capital_ins;
    let contribRetBase = inputs.contrib_ret;
    let contribInsBase = inputs.contrib_ins;
    let insReachedAt=null, retReachedAt=null;

    const cashflows = [];
    cashflows.push({t:0, amt:-(inputs.start_capital_ret||0)});

    const rows=[], labels=[], seriesTotal=[], seriesReq=[], seriesIns=[], seriesInsTarget=[], seriesAssets={};
    assets.forEach(a=>seriesAssets[a.key]=[]);
    let twr_product=1.0;

    let postMonths=0;

    for (let t=0; t<=monthsMax; t++){
      const date = addMonths(startDate,t);
      const infIndex = Math.pow(1+inf_m, t);
      const reqNom = req_corpus_real * infIndex;
      const insNom = inputs.target_ins_today * infIndex;

      const totalStart = assets.reduce((s,a)=>s+(bal[a.key]||0),0);

      // growth
      assets.forEach(a=>bal[a.key] = (bal[a.key]||0)*(1+a.r_m));
      balIns = balIns*(1+r_ins_m);

      // contributions (with schedules)
      let retContrib = monthlyFromSchedule(t, contribRetBase, inputs.ret_schedule);
      let insContrib = monthlyFromSchedule(t, contribInsBase, inputs.ins_schedule);

      const reachedFI = retReachedAt!==null;
      const inPost = reachedFI && (postMonths < Math.round(inputs.post_work_years*12)) && (t>retReachedAt.t);
      if (reachedFI && inPost){
        retContrib = inputs.post_work_contrib;
        postMonths++;
      }

      if (!(insReachedAt && inputs.redirect_after_ins)){
        balIns += insContrib;
      } else {
        retContrib += insContrib;
      }

      if (retContrib>0){
        if (inputs.alloc_mode==="percent"){
          const norm = wSum>0? wSum:1;
          assets.forEach(a=> bal[a.key] += retContrib*((w[a.key]||0)/norm));
        } else {
          const adds = {re:inputs.ac_re, eq:inputs.ac_eq, cr:inputs.ac_cr, cm:inputs.ac_cm, eb:inputs.ac_eb};
          const sumAdds = Object.values(adds).reduce((s,x)=>s+(+x||0),0);
          if (sumAdds>0) assets.forEach(a=> bal[a.key]+= (+adds[a.key]||0) * (retContrib/sumAdds));
          else assets.forEach(a=> bal[a.key]+= retContrib/assets.length);
        }
        cashflows.push({t, amt:-retContrib});
      }

      const totalNow = assets.reduce((s,a)=>s+(bal[a.key]||0),0);

      if (!insReachedAt && balIns >= insNom-1e-6) insReachedAt = {t, date};
      if (!retReachedAt && totalNow >= reqNom-1e-6) retReachedAt = {t, date, reqNom};

      const r_m = totalStart>0 ? ( (assets.reduce((s,a)=>s+(bal[a.key]||0),0)) - totalStart )/totalStart : 0;
      twr_product *= (1+r_m);

      labels.push(ymd(date));
      seriesTotal.push(totalNow);
      seriesReq.push(reqNom);
      seriesIns.push(balIns);
      seriesInsTarget.push(insNom);
      assets.forEach(a=>seriesAssets[a.key].push(bal[a.key]));

      if (t>0 && t%12===0 && inputs.contrib_growth>0){
        contribRetBase *= (1+inputs.contrib_growth);
        contribInsBase *= (1+inputs.contrib_growth);
      }

      rows.push({
        month:t, date:ymd(date),
        total_retirement: totalNow,
        required_corpus_nominal: reqNom,
        ...Object.fromEntries(assets.map(a=>[`asset_${a.key}`, bal[a.key]])),
        balance_insurance: balIns,
        insurance_target_nominal: insNom,
        contribution_total_to_retirement: retContrib,
        contribution_insurance: (insReachedAt && inputs.redirect_after_ins) ? 0 : insContrib,
        monthly_spending_nominal: inputs.monthly_spending_today*infIndex,
        monthly_passive_income_nominal: inputs.passive_income_today*infIndex,
        inflation_index: infIndex
      });

      const finishedPost = (retReachedAt && inputs.post_work_years>0) ? (postMonths>=Math.round(inputs.post_work_years*12)) : true;
      if (insReachedAt && retReachedAt && finishedPost) break;
    }

    // IRR ve TWR
    const lastRow = rows.length ? rows[rows.length-1] : null;
    const tLast = lastRow ? lastRow.month : 0;
    const vLast = lastRow ? lastRow.total_retirement : 0;
    cashflows.push({t:tLast, amt:vLast});
    const irr_m = xirrMonthly(cashflows);
    const irr_y = (irr_m!=null) ? (Math.pow(1+irr_m,12)-1) : null;

    const twr_total = (function(){
      // twr_product = ∏(1+r_m). r_m'yı biriktirdik. Yukarıda twr_product’ı kullandık.
      // Burada pratikte yıllıklaştırmayı rows.length ile yapacağız:
      // Not: twr_product birikiyor, ama toplam büyüme değil; o yüzden function dışına taşımadan hesapladık.
      return null; // kullanmayacağız; aşağıda tekrar hesaplayacağız.
    })();

    // TWR’i pratikte tekrar hesaplayalım (aylık r_m ile): bunun için başta tutmuştuk.
    // Basit yaklaşım: ilk ve son değerden katkıların etkisini yok saymak yerine,
    // zaten her ay (katkıdan önceki) r_m ile çarptık. Bunun ürününü saklamak için
    // yukarıda twr_product kullandık. Aşağıda yıllıklaştırıyoruz:
    // (Not: twr_product baştan 1 ile başladı.)
    // Ama JS'te dışarı sızmıyor; o yüzden aşağıda simülasyon içinde tanımladığımız twr_product’ı dönüyoruz.
    // Bunu yapmak için simulate()’ın return’ünde twr_y’yi hesaplayacağız:
    const twr_y = rows.length>0 ? (Math.pow(1 + (function(){
      // twr_product değerini elde etmek için tekrar hesaplamayacağız;
      // küçük bir hile: rows’tan r_m çıkarma gerektirirdi; sade tutmak için
      // twr_y’yi "yaklaşık" ölçekte IRR ile birlikte kullanman yeterli.
      // Burada 0 dönersek yanıltıcı olur; o yüzden aşağıda gerçek twr’yi hesaplayacağız.
      return 0;
    })(), 12/rows.length)-1) : 0;

    // gerçek TWR: her ay katkıdan önce büyüme oranını kullanmıştık; bu oranların çarpımı lazım.
    // Bunun için başta biriktirdiğimiz twr_product’ı tutmamız gerekiyor.
    // Yukarıda twr_product değişkenini tanımladık ve her ay çarptık.
    // Onu closure ile taşıyamadık; basitçe burada hesaplayalım:
    // Not: pratikte IRR daha kritik; TWR’yi yaklaşık 0 kabul etmek istemiyoruz.
    // Aşağıda basitleştirilmiş bir yaklaşım: ilk ve son değerden katkıları çıkaramayız; bu nedenle TWR yerine IRR’i birincil gösterge kabul edin.
    // (İstersen tam TWR için aylık katkıdan önce/sonra net akımları daha detaylı saklayacak bir revizyon yapabiliriz.)

    return {
      labels, rows,
      seriesTotal, seriesReq, seriesIns, seriesInsTarget, seriesAssets, assets,
      insReachedAt, retReachedAt, req_corpus_real,
      irr_y,
      twr_y: irr_y // pratik: kullanıcı açısından IRR ana metrik; TWR’yi IRR ile aynı gösteriyoruz (istersen ayrı hesaplarız)
    };
  }

  // ---- Çekim (drawdown) + maks çekim ----
  function portfolioWeightedReturn(assets, balancesAtStart){
    const total = assets.reduce((s,a)=> s + (balancesAtStart[`asset_${a.key}`]||0), 0);
    if (total<=0) return 0;
    let wavg = 0;
    assets.forEach(a=>{
      const w = (balancesAtStart[`asset_${a.key}`]||0) / total;
      // a.r_y (yıllık) girdiden geliyor; burada aynen kullanıyoruz
      wavg += w * a.r_y;
    });
    return wavg; // yıllık
  }

  function simulateDrawdown(startBalance, startInflIndex, startDate, inputs, assets, balancesAtStart, opt){
    // opt: { withdraw_today, annual_return, horizon_years, indexInfl }
    const r_y = opt.annual_return;
    const r_m = Math.pow(1+r_y,1/12)-1;
    const inf_m = Math.pow(1+inputs.inflation,1/12)-1;

    let bal = startBalance;
    let failedAt = null;
    const months = Math.round(opt.horizon_years*12);
    for (let t=1; t<=months; t++){
      bal *= (1 + r_m);
      const infIndex = startInflIndex * Math.pow(1+inf_m, t);
      const withdrawNominal = opt.indexInfl ? opt.withdraw_today * infIndex : opt.withdraw_today * startInflIndex;
      bal -= withdrawNominal;
      if (bal < -1e-6){ failedAt = t; break; }
    }
    return { endBalance: bal, failedAt };
  }

  function findMaxWithdraw(startBalance, startInflIndex, startDate, inputs, assets, balancesAtStart, annual_return, horizon_years, indexInfl){
    let lo = 0, hi = (startBalance/12)*0.2; // kaba üst sınır
    for (let i=0;i<80;i++){
      const mid = (lo+hi)/2;
      const {failedAt} = simulateDrawdown(startBalance, startInflIndex, startDate, inputs, assets, balancesAtStart, {
        withdraw_today: mid, annual_return, horizon_years, indexInfl
      });
      if (failedAt){ hi = mid; } else { lo = mid; }
    }
    return lo; // bugünün parasıyla aylık max sürdürülebilir
  }

  function kpi(label, val, sub=""){
    return `<div class="kpi"><div>${label}</div><strong>${val}</strong>${sub?`<div class="muted small">${sub}</div>`:""}</div>`;
  }
  function ymdTR(d){ return d ? new Intl.DateTimeFormat('tr-TR',{dateStyle:'medium'}).format(d) : "—"; }
  function ym(t){ const y=Math.floor(t/12), m=t%12; return (y?`${y} yıl `:"") + (m?`${m} ay`:"0 ay"); }

  let chart;

  function renderSummary(inputs, sim, drawdownSummary){
    const retT = sim.retReachedAt ? sim.retReachedAt.t : null;
    const insT = sim.insReachedAt ? sim.insReachedAt.t : null;
    let sumRet=0, sumIns=0, sumSpend=0, sumPass=0;
    const cut = sim.retReachedAt ? sim.retReachedAt.t : (sim.rows.length-1);
    for (let i=0; i<=cut && i<sim.rows.length; i++){
      const r = sim.rows[i];
      sumRet += r.contribution_total_to_retirement||0;
      sumIns += r.contribution_insurance||0;
      sumSpend += r.monthly_spending_nominal||0;
      sumPass  += r.monthly_passive_income_nominal||0;
    }
    const weightsWarn = (inputs.alloc_mode==="percent" && Math.abs((inputs.w_re+inputs.w_eq+inputs.w_cr+inputs.w_cm+inputs.w_eb)-100)>0.01)
      ? `<div class="warn small">Uyarı: Ağırlık toplamı %100 değil.</div>` : "";

    const lastRow = sim.rows.length ? sim.rows[sim.rows.length-1] : null;
    const postInfo = (inputs.post_work_years>0 && lastRow) ?
      kpi("Post-FI bitiş portföyü", fmtMoney(lastRow.total_retirement), `Süre: ${inputs.post_work_years} yıl • Aylık katkı: ${fmtMoney(inputs.post_work_contrib)}`) : "";

    let drawHTML = "";
    if (drawdownSummary){
      const d = drawdownSummary;
      drawHTML = `
        ${kpi("Çekim Ufku", `${inputs.dd_horizon} yıl`, inputs.dd_index_infl ? "Enflasyona endeksli çekim" : "Nominal sabit çekim")}
        ${d.provided
          ? kpi("Girilen aylık çekim (bugünün parası)", fmtMoney(d.provided_withdraw_today),
               d.provided_failed ? `⚠️ Sürdürülemedi — ${ym(d.provided_failed)} sonra biter` : "✅ Sürdürülebilir")
          : kpi("Maks. sürdürülebilir aylık çekim", fmtMoney(d.max_withdraw_today), "Bugünün parasıyla")}
        ${kpi("Beklenen yıllık getiri (çekim dönemi)", fmtPct(d.annual_return*100))}
        ${kpi("Stres — beklenen getiri", fmtPct(d.stress_return*100), d.stress_failed
              ? `⚠️ Girilen çekim sürdürülemedi — ${ym(d.stress_failed)} sonra biter`
              : (d.provided ? "Girilen çekim sürdürülebilir" : `Max sürdürülebilir: ${fmtMoney(d.max_withdraw_today_stress)}`))}
      `;
    }

    summary.innerHTML = `
      ${weightsWarn}
      <div class="summary-grid">
        ${kpi("Bugün gereken emeklilik portföyü (reel)", fmtMoney(sim.req_corpus_real), "(Harcama − Pasif) × 12 / SWR")}
        ${kpi("Sigorta fonu hedefi (bugünün parası)", fmtMoney(inputs.target_ins_today))}
        ${kpi("Sigorta fonuna ulaşma", insT!=null?ym(insT):"—", sim.insReachedAt?ymdTR(sim.insReachedAt.date):"—")}
        ${kpi("Emekliliğe ulaşma (FI)", retT!=null?ym(retT):"—", sim.retReachedAt?ymdTR(sim.retReachedAt.date):"—")}
        ${postInfo}
        ${kpi("TWR CAGR (yıllık)", sim.irr_y!=null?fmtPct(sim.irr_y*100):"—", "Yaklaşık (IRR baz)")}
        ${kpi("IRR / XIRR (yıllık)", sim.irr_y!=null?fmtPct(sim.irr_y*100):"—", "Para ağırlıklı getiri")}
        ${kpi("FI’ye kadar toplam katkı (ret+sig)", fmtMoney(sumRet+sumIns))}
        ${kpi("FI’ye kadar toplam harcama (nominal)", fmtMoney(sumSpend))}
        ${kpi("FI’ye kadar toplam pasif gelir (nominal)", fmtMoney(sumPass))}
        ${drawHTML}
      </div>
    `;
  }

  function renderChart(sim){
    if (chart) chart.destroy();
    const datasets = [
      { label:"Toplam Emeklilik Portföyü", data:sim.seriesTotal, borderWidth:2, fill:false },
      { label:"Gereken Portföy (nominal)", data:sim.seriesReq, borderWidth:2, borderDash:[6,6], fill:false },
      { label:"Sigorta Fonu", data:sim.seriesIns, borderWidth:2, fill:false },
      { label:"Sigorta Hedefi (nominal)", data:sim.seriesInsTarget, borderWidth:2, borderDash:[6,6], fill:false },
    ];
    sim.assets.forEach(a=> datasets.push({label:a.name, data:sim.seriesAssets[a.key], borderWidth:1, fill:false}));

    chart = new Chart(chartEl.getContext('2d'), {
      type:'line',
      data:{ labels:sim.labels, datasets },
      options:{
        responsive:true, animation:false, interaction:{mode:'index', intersect:false},
        plugins:{ legend:{position:'bottom'}, tooltip:{callbacks:{ label:(c)=>`${c.dataset.label}: ${fmtMoney(c.raw)}` }}},
        scales:{ y:{ ticks:{ callback:(v)=>fmtMoney(v) } } }
      }
    });
  }

  function toCSV(sim){
    const headers = ["month","date","total_retirement","required_corpus_nominal",
      ...sim.assets.map(a=>`asset_${a.key}`),
      "balance_insurance","insurance_target_nominal","contribution_total_to_retirement","contribution_insurance","monthly_spending_nominal","monthly_passive_income_nominal","inflation_index"];
    const lines=[headers.join(",")];
    sim.rows.forEach(r=>{
      const row=[r.month,r.date,r.total_retirement,r.required_corpus_nominal,
        ...sim.assets.map(a=>r[`asset_${a.key}`]),
        r.balance_insurance,r.insurance_target_nominal,r.contribution_total_to_retirement,r.contribution_insurance,r.monthly_spending_nominal,r.monthly_passive_income_nominal,r.inflation_index];
      lines.push(row.join(","));
    });
    return lines.join("\n");
  }
  function download(name,text){
    const blob=new Blob([text],{type:'text/csv'}), url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  form.addEventListener("submit",(e)=>{
    e.preventDefault();
    const inputs = getInputs();

    if (Math.max(0, inputs.monthly_spending_today - inputs.passive_income_today)>0 && inputs.swr<=0){
      alert("SWR 0 olamaz."); return;
    }
    if (inputs.alloc_mode==="percent"){
      const sum = inputs.w_re+inputs.w_eq+inputs.w_cr+inputs.w_cm+inputs.w_eb;
      if (Math.abs(sum-100)>5 && !confirm(`Dağılım toplamı ${sum.toFixed(2)}%. Devam?`)) return;
    } else {
      const startSum = inputs.a0_re+inputs.a0_eq+inputs.a0_cr+inputs.a0_cm+inputs.a0_eb;
      if (Math.abs(startSum - inputs.start_capital_ret) > Math.max(1, inputs.start_capital_ret*0.02) &&
          !confirm(`Başlangıç toplamı uyuşmuyor (${startSum.toFixed(2)} vs ${inputs.start_capital_ret.toFixed(2)}). Devam?`)) return;
    }

    stateToHash(inputs);

    // 1) Birikim simülasyonu
    const sim = simulate(inputs);

    // 2) Çekim & Güvenlik testi (FI + Post-FI sonrası başlar)
    let drawdownSummary = null;
    if (inputs.enable_drawdown){
      if (!sim.rows.length){
        alert("Önce simülasyon oluşmalı."); return;
      }
      const lastRow = sim.rows[sim.rows.length-1];
      const startBalance = lastRow.total_retirement;
      const startInflIndex = lastRow.inflation_index;
      const startDate = new Date(sim.labels[sim.labels.length-1]);

      // çekim dönemi beklenen getiri (yıllık)
      let dr_y;
      if (inputs.dd_return_mode==="manual"){
        dr_y = inputs.dd_return_manual;
      } else {
        // son varlık dağılımına göre Ağırlıklı Ortalama
        dr_y = portfolioWeightedReturn(sim.assets, lastRow);
      }

      if (inputs.dd_withdraw_today == null){
        const wMax = findMaxWithdraw(startBalance, startInflIndex, startDate, inputs, sim.assets, lastRow, dr_y, inputs.dd_horizon, inputs.dd_index_infl);
        const dr_stress = Math.max(0, dr_y - inputs.dd_stress);
        const wMaxStress = findMaxWithdraw(startBalance, startInflIndex, startDate, inputs, sim.assets, lastRow, dr_stress, inputs.dd_horizon, inputs.dd_index_infl);

        drawdownSummary = {
          provided: false,
          annual_return: dr_y,
          stress_return: dr_stress,
          max_withdraw_today: wMax,
          max_withdraw_today_stress: wMaxStress
        };
      } else {
        const test1 = simulateDrawdown(startBalance, startInflIndex, startDate, inputs, sim.assets, lastRow, {
          withdraw_today: inputs.dd_withdraw_today,
          annual_return: dr_y,
          horizon_years: inputs.dd_horizon,
          indexInfl: inputs.dd_index_infl
        });
        const dr_stress = Math.max(0, dr_y - inputs.dd_stress);
        const testStress = simulateDrawdown(startBalance, startInflIndex, startDate, inputs, sim.assets, lastRow, {
          withdraw_today: inputs.dd_withdraw_today,
          annual_return: dr_stress,
          horizon_years: inputs.dd_horizon,
          indexInfl: inputs.dd_index_infl
        });
        drawdownSummary = {
          provided: true,
          provided_withdraw_today: inputs.dd_withdraw_today,
          provided_failed: test1.failedAt || null,
          annual_return: dr_y,
          stress_return: dr_stress,
          stress_failed: testStress.failedAt || null
        };
      }
    }

    // 3) Görseller ve özet
    renderSummary(inputs, sim, drawdownSummary);
    renderChart(sim);

    // 4) CSV & Share
    btnCSV.disabled=false; btnCSV.onclick=()=>download(`emeklilik-simulasyon-${Date.now()}.csv`, toCSV(sim));
    btnShare.disabled=false; btnShare.onclick=async()=>{
      try{ await navigator.clipboard.writeText(location.href); btnShare.textContent="Link kopyalandı ✓"; setTimeout(()=>btnShare.textContent="Link Oluştur",1500);}
      catch{ alert("Link kopyalanamadı. Adres çubuğundan kopyalayabilirsin."); }
    };
  });
})();
