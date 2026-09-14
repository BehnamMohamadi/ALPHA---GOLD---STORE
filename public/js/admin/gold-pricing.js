
const form=document.getElementById("goldPricingForm");
let exists=false;
const loadPricing=async()=>{
  try{
    const p=await AdminAPI.request("/api/goldPricing"),g=p?.data?.goldPricing;exists=true;
    ["gold18","gold21","gold22","gold24"].forEach(k=>{form.elements[k].value=g.prices?.[k]??"";document.getElementById(`card${k[0].toUpperCase()+k.slice(1)}`).textContent=AdminAPI.number(g.prices?.[k])});
    form.elements.profitPercent.value=g.profitPercent??"";form.elements.taxPercent.value=g.taxPercent??"";form.elements.source.value=g.source??"manual";
    document.getElementById("pricingKey").textContent=g.key;document.getElementById("pricingSource").textContent=g.source||"—";
    document.getElementById("pricingUpdatedBy").textContent=g.updatedBy?`${g.updatedBy.firstname||""} ${g.updatedBy.lastname||""}`.trim():"—";
    document.getElementById("pricingUpdated").textContent=AdminAPI.date(g.updatedAt);
  }catch(e){if(e.status===404){exists=false;adminToast("هنوز GoldPricing ساخته نشده است.","error")}else adminToast(e.message,"error")}
};
form.addEventListener("submit",async e=>{e.preventDefault();const d=new FormData(form);const body={prices:{gold18:Number(d.get("gold18")),gold21:Number(d.get("gold21")),gold22:Number(d.get("gold22")),gold24:Number(d.get("gold24"))},profitPercent:Number(d.get("profitPercent")),taxPercent:Number(d.get("taxPercent")),source:d.get("source")||"manual"};try{await AdminAPI.request("/api/goldPricing",{method:exists?"PUT":"POST",body});adminToast(exists?"قیمت‌ها بروزرسانی شد.":"قیمت طلا ساخته شد.");loadPricing()}catch(err){adminToast(err.message,"error")}});
loadPricing();
