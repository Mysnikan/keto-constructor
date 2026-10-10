/* Bounded least-squares fit of actual ingredient weights for a complete daily menu. */
window.fitDailyMenu=function(selected,targets){
 const limits=[targets.K,targets.P,targets.F,targets.C],goal=limits.map(v=>v*.98),weights=[3,2,2,3],vars=[];
 selected.forEach((dish,meal)=>dish.ings.forEach(([name,a,u])=>{
  const food=foodNutrition[nutritionAliases[name]||name],base=ingredientGrams(name,a,u)/(dish.servings||1);
  const oil=/масло/i.test(name),herb=/укроп|петруш|зелень|чеснок|сок|лук|шпинат|салат/i.test(name),vegetable=food[3]>food[1]&&!oil;
  const nominal=base*targets.K/selected.length/dish.k;
  const lo=oil?0:base*(herb||vegetable?.2:.4);
  const hi=oil?Math.max(base*3,35):herb?Math.max(base*1.8,5):vegetable?Math.max(base*2,100):Math.max(base*3,300);
  vars.push({meal,name,base,nominal,lo,hi,x:Math.max(lo,Math.min(hi,nominal)),a:[food[0],food[1],food[2],food[3]].map(v=>v/100)});
 }));
 const scales=goal.map((v,i)=>Math.max(v,i===0?100:5));
 const totals=()=>goal.map((_,i)=>vars.reduce((sum,v)=>sum+v.a[i]*v.x,0));let sum=totals();
 // Coordinate descent solves a convex quadratic under recipe-preserving bounds.
 for(let iteration=0;iteration<2500;iteration++){
  let movement=0;
  for(const v of vars){let numerator=0,denominator=0;
   for(let j=0;j<4;j++){const w=weights[j]/scales[j]**2;numerator+=w*v.a[j]*(goal[j]-sum[j]+v.a[j]*v.x);denominator+=w*v.a[j]**2;}
   const regularizer=.003/Math.max(v.nominal,10)**2;numerator+=regularizer*v.nominal;denominator+=regularizer;
   const next=Math.max(v.lo,Math.min(v.hi,numerator/denominator)),delta=next-v.x;
   v.x=next;movement=Math.max(movement,Math.abs(delta));for(let j=0;j<4;j++)sum[j]+=v.a[j]*delta;
  }
  if(movement<.00001)break;
 }
 // Bias every target downward. Keep all four actual totals below the entered values.
 const carbScale=Math.min(1,...sum.map((value,i)=>value>0?Math.max(0,limits[i]*.99/value):1));
 const portions=selected.map((dish,i)=>({dish,ings:vars.filter(v=>v.meal===i).map(v=>[v.name,Math.floor(v.x*carbScale*10)/10,'г'])}));
 const total={k:0,p:0,f:0,total:0,c:0,fiber:0};portions.forEach(p=>{p.n=calculateNutrition(p.ings);Object.keys(total).forEach(key=>total[key]+=p.n[key])});
 const close=Math.abs(total.k-targets.K)<=targets.K*.05&&Math.abs(total.p-targets.P)<=targets.P*.1&&Math.abs(total.f-targets.F)<=targets.F*.1&&total.total<=targets.C+1e-6;
 return{portions,total,close};
};
