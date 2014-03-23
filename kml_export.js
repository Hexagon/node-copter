var sqlite3 = require("sqlite3"),
  config = require('./config.json'),
  fs = require('fs'),
  path = require('path');

module.exports = {
  Export: function (file,callback) {

    // Initiate sqlite3 database
    var db_file = path.join(__dirname, 'db/'+file);
    var exists = fs.existsSync(db_file);
    db = new sqlite3.Database(db_file);
    this.db = db;

    // Create
    if (exists) {

      var doc_template = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n\t<Document>';
      doc_template += '\n\t\t<name>{{tpl_name}}</name>';
      doc_template += '\n\t\t<description>{{tpl_description}}</description>';
      //doc_template += '{{tpl_styles}}';
      doc_template += '{{tpl_placemarks}}';
      doc_template += '\n\t</Document>';
      doc_template += '\n</kml>';

      /*<Style id="yellowLineGreenPoly">
        <LineStyle>
          <color>7f00ffff</color>
          <width>4</width>
        </LineStyle>
        <PolyStyle>
          <color>7f00ff00</color>
        </PolyStyle>
      </Style>*/

      var placemark_template = '\n\t\t<Placemark>';
      /*placemark_template = '\n\t\t\t<name>{{tpl_name}}</name>';
      placemark_template = '\n\t\t\t<description>{{tpl_description}}</description>';
      placemark_template = '\n\t\t\t<styleUrl>{{tpl_url}}</styleUrl>';*/
      placemark_template += '\n\t\t\t<LineString>';
      placemark_template += '\n\t\t\t\t<extrude>1</extrude>';
      placemark_template += '\n\t\t\t\t<tessellate>1</tessellate>';
      placemark_template += '\n\t\t\t\t<altitudeMode>absolute</altitudeMode>';
      placemark_template += '\n\t\t\t\t<coordinates>{{tpl_coordinates}}</coordinates>';
      placemark_template += '\n\t\t\t</LineString>';
      placemark_template += '\n\t\t</Placemark>';

      // gps_raw_int (
        /*ref_usec INTEGER,
         time_usec INTEGER,
          lat INTEGER,
          lon INTEGER,
           alt INTEGER,
            eph REAL,
             epv REAL,
              vel REAL,
               cog REAL,
                fix_type INTEGER,
                 satellites_visible INTEGER
                 );*/

      db.all("SELECT * FROM gps_raw_int WHERE fix_type > 1", function(error,result) {

        var placemarks = "";
        var coordinates = "";
        for(i in result) {
          var row = result[i]
            , tpl_instance = placemark_template;
          coordinates +=(row.lon/10000000).toString().replace(',','.') + ',' + (row.lat/10000000).toString().replace(',','.') + ',' + (row.alt/1000).toString().replace(',','.') + "\r\n";
        }
        placemarks = tpl_instance.replace('{{tpl_coordinates}}',coordinates);
        doc_template = doc_template.replace('{{tpl_name}}', config.aircraft.name + '\'s flight path');
        doc_template = doc_template.replace('{{tpl_description}}', 'From database ' + file);
        doc_template = doc_template.replace('{{tpl_placemarks}}', placemarks);

        callback(doc_template);

      });
    } else {
      return false;
    }
  }
}