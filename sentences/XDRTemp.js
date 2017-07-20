/*
    $IIXDR,C,19.52,C,TempAir*3D
*/
// to verify

const nmea = require('../nmea.js');
module.exports = function(app) {
  return {
      title: "XDR (TempAir) - Air temperature.",
      keys: [
        'environment.outside.temperature'
      ],
      f: function XDRTemp(temperature) {
        var celcius = temperature - 273.15;
        return nmea.toSentence([
          '$IIXDR',
          'C',
          celcius.toFixed(2),
          'C',
          'TempAir'
        ]);
      }
  };
}
