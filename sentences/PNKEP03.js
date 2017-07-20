
/*
Sentence 3
$PNKEP,03,x.x,x.x,x.x*hh
| optimum angle from 0 to 359°
 | VMG efficiency up/down wind in %
| Polar efficiency in %

*/

// to verify
const nmea = require('../nmea.js');
module.exports = function(app) {
  return {
      title: "PNKEP,03 - Polar and VMG, and optimum angle.",
      keys: [
        'performance.targetAngle', 'performance.velocityMadeGood', 'performance.targetSpeed', 'performance.polarSpeedRatio'
      ],
      f: function pnkep2(targetAngle, velocityMadeGood, targetSpeed, polarSpeedRatio) {
        console.log("GOT Target angle -----------------------------------");
         var vmgRatio = 1.0;
        if ( targetSpeed > 1.0E-3 ) {
          vmgRatio = velocityMadeGood/targetSpeed;
        } 
        if ( vmgRatio < 0) {
          vmgRatio = -vmgRatio;
        }
        return nmea.toSentence([
          '$PNKEP',
          '03',
          (polarSpeedRatio*100.0).toFixed(2),
          (vmgRatio*100.0).toFixed(2),
          nmea.radsToDeg(targetAngle).toFixed(2)
        ]);
      }
  };
}