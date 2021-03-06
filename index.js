const Bacon = require('baconjs');
const path = require('path')
const fs = require('fs')

module.exports = function(app) {

  function createLogger(logdir) {
    var winston = require('winston'),
      transports = [];

    require('winston-daily-rotate-file')

    var logfilename = require('path').join(
      (logdir.indexOf('/') === 0 ? '' : (__dirname + "/../") ) +
      logdir +
      "/signalk-nmea.log");
    transports.push(new winston.transports.DailyRotateFile({
      name: 'file',
      datePattern: '.yyyy-MM-ddTHH',
      filename: logfilename,
      json: false,
      formatter: function(options) {
        // Return string will be passed to logger.
        return new Date().getTime() + ';' + options.message;
      }
    }));
    return new winston.Logger({
      transports: transports
    });
  }


  function load_sentences (app, plugin, dir) {
    fpath = path.join(__dirname, dir)
    files = fs.readdirSync(fpath).filter(function(f) {
      return f.endsWith('.js');
    });
    return files.map(fname => {
      sentence = path.basename(fname, '.js')
      var sobj = require(path.join(fpath, sentence))(app, plugin);
      sobj.optionKey = sentence;
      return sobj;
    }).filter(calc => { return typeof calc !== 'undefined'; });
  }


  var plugin = {
    unsubscribes: []
  };

  plugin.id = "sk-to-nke"
  plugin.name = "Convert Signal K to NKE NMEA0183"
  plugin.description = "Plugin to convert Signal K to NKE NMEA0183"

  plugin.schema = {
    type: "object",
    title: "Conversions to NKE NMEA0183",
    description: "If there is SK data for the conversion generate the following NKE NMEA0183 sentences from Signal K data:",
    properties: {}
  }
  plugin.logger = createLogger('/var/log/signalk');
  
  plugin.start = function(options) {
    const selfContext = 'vessels.' + app.selfId
    const selfMatcher = (delta) => delta.context && delta.context === selfContext

    function mapToNmea(encoder, name) {
      if ( encoder.ttl === undefined) {
        encoder.ttl = 5000; // default frequency of dupliate send
      }
      if ( encoder.debounce === undefined) {
        encoder.debounce = 2000;
      }
      encoder.nextOutput = 0;
      const selfStreams = encoder.keys.map(app.streambundle.getSelfStream, app.streambundle);
      // subscribe to the input streams, applying a debounce and checking for duplicates.
      // debounce limits the frequency of messages.
      // skiDuplicates limits repeat messages within a time period.
      // encoder.ttl should be > encoder.debounce.
      plugin.unsubscribes.push(Bacon.combineWith(encoder.f, selfStreams).changes().
        debounceImmediate(encoder.debounce).
        skipDuplicates(function(before,after) {
          var tnow = (new Date()).getTime();
          if ( before === after ) {
            if ( encoder.nextOutput > tnow ) {
              // console.log("NMEA0183 Encoder",name,"Caught Duplicate ", before);
              return true;
            }
            // console.log("NMEA0183 Encoder",name,"Duplicate sent due to ttl");
          }
          encoder.nextOutput = tnow+encoder.ttl;
          return false;

      }).onValue(nmeaString => {
        //console.log("NMEA0183 Encoder",name," ",nmeaString);

        // plugin.logger.info(nmeaString);
        app.emit('nmea0183out', nmeaString);
      }));
      // Could create a logger that subscribes to all changes here and only emits once per n seconds.
    }




    for (var i = plugin.sentences.length - 1; i >= 0; i--) {
        var sentence = plugin.sentences[i];
        if ( options[sentence.optionKey]) {
          mapToNmea(plugin.sentences[i], sentence.optionKey);
        }
    };
  }

  plugin.stop = function() {
    plugin.unsubscribes.forEach(f => f())
  }


  plugin.sentences = load_sentences(app, plugin, 'sentences')
  plugin.sentences = [].concat.apply([], plugin.sentences)

  //===========================================================================
  for (var i = plugin.sentences.length - 1; i >= 0; i--) {
    var sentence = plugin.sentences[i];
    plugin.schema.properties[sentence.optionKey] = {
      title: sentence['title'],
      type: "boolean",
      default: false
    }
  };
  

  return plugin;
}








