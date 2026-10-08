import assert from 'node:assert/strict';
import {chartPeriods,compareIndicators} from '../chart-comparison.js';

const indicator = (values, scale=1) => ({values:Object.fromEntries(chartPeriods.map((key,index)=>[key,values[index]===null?null:values[index]*scale])),dates:Object.fromEntries(chartPeriods.map(key=>[key,key+'-date']))});
const stocks=indicator([100,105,110,95,120]),currency=indicator([1000,950,980,1020,1100]);
let result=compareIndicators([stocks,currency]);
assert.equal(result.baseline,'quarter');
assert.deepEqual(result.series[0].points.map(p=>p.percent),[0,5,10,-5,20]);
assert.deepEqual(result.series[1].points.map(p=>p.percent),[0,-5,-2,2,10]);
// Unit conversions must not alter a comparison (e.g. dollars vs cents).
assert.deepEqual(compareIndicators([stocks,indicator([1000,950,980,1020,1100],100)]).series[1].points.map(p=>p.percent),result.series[1].points.map(p=>p.percent));
// Missing observations retain their original period and never become zero.
result=compareIndicators([indicator([null,100,null,110,120]),currency]);
assert.equal(result.baseline,'month');
assert.equal(result.series[0].points[2].percent,null);
assert.equal(result.series[0].points[2].index,2);
assert.equal(result.series[0].points[4].percent,20);
assert.equal(result.series[0].points[4].date,'current-date');
// Zero cannot be a denominator; fallback must use the same period for both.
assert.equal(compareIndicators([indicator([0,10,11,12,13]),currency]).baseline,'month');
assert.equal(compareIndicators([indicator([0,null,null,null,null]),currency]).baseline,undefined);
assert.equal(compareIndicators([indicator([0,null,null,null,null]),currency]).series[0].points[0].percent,null);
// Negative yields crossing zero preserve the direction of their change.
result=compareIndicators([indicator([-1,-.5,0,.5,1]),currency]);
assert.deepEqual(result.series[0].points.map(p=>p.percent),[0,50,100,150,200]);
assert.equal(compareIndicators([stocks,stocks]).series[1].points[4].percent,20);
console.log('PASS: two-series comparison, unit invariance, missing periods, zero and negative baselines.');
