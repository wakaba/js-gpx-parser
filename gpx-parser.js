function GPXParser () { }

GPXParser.prototype.parseText = function (text) {
  // XXX need XML5 parser
  var parser = new DOMParser;
  var doc = parser.parseFromString (text, 'text/xml');
  return this.parseDocument (doc);
}; // parseText

GPXParser.prototype.parseDocument = function (doc) {
  var el = doc.documentElement;
  if (el && el.localName === 'gpx') {
    return this.parseGPXElement (el);
  } else {
    return null;
  }
}; // parseDocument

GPXParser.prototype.parseGPXElement = function (el) {
  var self = this;
  var dataSet = {waypoints: [], routes: [], tracks: [], links: []};
  var creator = el.getAttribute ('creator');
  if (creator !== null && creator !== '') {
    dataSet.generator = creator;
  }
  var offset = el.getAttributeNS ('data:,gpx', 'tzoffset');
  if (offset !== null && offset !== '') {
    dataSet.time_zone_offset = self._tzOffset (offset); // or null
  }
  Array.prototype.forEach.call (el.childNodes, function (child) {
    if (child.localName === 'metadata') {
      Array.prototype.forEach.call (child.childNodes, function (gc) {
        if (gc.localName === 'name') {
          self._string (gc, dataSet, 'name');
        } else if (gc.localName === 'desc') {
          self._string (gc, dataSet, 'desc');
        } else if (gc.localName === 'keywords') {
          self._string (gc, dataSet, 'keywords');
        } else if (gc.localName === 'link') {
          self._link (gc, dataSet);
        } else if (gc.localName === 'author') {
          self._person (gc, dataSet, 'author');
        } else if (gc.localName === 'copyright') {
          self._license (gc, dataSet, 'license');
        } else if (gc.localName === 'time') {
          var key = gc.namespaceURI === 'http://www.topografix.com/GPX/gpx_modified/0/1' ? 'updated' : 'timestamp';
          if (dataSet[key] == null) {
            dataSet[key] = self._globalDT (self._childText (gc));
          }
        } else if (gc.localName === 'bounds') {
          if (dataSet.min_lat == null) {
            dataSet.min_lat = self._latValue (gc.getAttribute ('minlat'));
          }
          if (dataSet.min_lon == null) {
            dataSet.min_lon = self._lonValue (gc.getAttribute ('minlon'));
          }
          if (dataSet.max_lat == null) {
            dataSet.max_lat = self._latValue (gc.getAttribute ('maxlat'));
          }
          if (dataSet.max_lon == null) {
            dataSet.max_lon = self._lonValue (gc.getAttribute ('maxlon'));
          }
        }
      });
    } else if (child.localName === 'wpt') {
      dataSet.waypoints.push (self._point (child));
    } else if (child.localName === 'rte') {
      dataSet.routes.push (self._route (child));
    } else if (child.localName === 'trk') {
      dataSet.tracks.push (self._track (child));
    }
  });
  return dataSet;
}; // parseGPXElement

GPXParser.prototype._pointFields = {
  sat: ['satelite_count', '_nnnumber'],
  dgpsid: ['dgps_id', '_nnnumber'],
  ele: ['elevation', '_number'],
  geoidheight: ['geoid_height', '_number'],
  hdop: ['hdop', '_number'],
  vdop: ['vdop', '_number'],
  pdop: ['pdop', '_number'],
  ageofdgpsdata: ['age_of_dgps_data', '_number'],
  speed: ['speed', '_number'],
  magvar: ['magnetic_variation', '_degree'],
  time: ['timestamp', '_time'],
  name: ['name', '_string'],
  desc: ['desc', '_string'],
  cmt: ['comment', '_string'],
  src: ['source', '_string'],
  sym: ['symbol_name', '_string'],
  type: ['type', '_string'],
  fix: ['fix', '_string'],
};

GPXParser.prototype._pointExtFields = {
  cadence: ['cadence', '_number'],
  distance: ['distance', '_number'],
  hr: ['heartrate', '_number'],
  heartrate: ['heartrate', '_number'],
  power: ['power', '_number'],
  temp: ['temperature', '_number'],
  speed: ['speed', '_number'],
  accuracy: ['accuracy', '_number'],
};

GPXParser.prototype._pointTPExtFields = {
  atemp: ['temperature', '_number'],
  wtemp: ['water_temperature', '_number'],
  depth: ['depth', '_number'],
  hr: ['heartrate', '_number'],
  cad: ['cadence', '_number'],
};

GPXParser.prototype._routeFields = {
  name: ['name', '_string'],
  desc: ['desc', '_string'],
  cmt: ['comment', '_string'],
  src: ['source', '_string'],
  type: ['type', '_string'],
  number: ['number', '_nnnumber'],
};

GPXParser.prototype._trackFields = {
  name: ['name', '_string'],
  desc: ['desc', '_string'],
  cmt: ['comment', '_string'],
  src: ['source', '_string'],
  type: ['type', '_string'],
  number: ['number', '_nnnumber'],
};

GPXParser.prototype._point = function (el) {
  var self = this;
  var point = {links: []};
  point.lat = self._latValue (el.getAttribute ('lat'));
  point.lon = self._lonValue (el.getAttribute ('lon'));
  point.road_type = el.getAttributeNS ('data:,gpx', 'road');
  Array.prototype.forEach.call (el.childNodes, function (child) {
    var field = self._pointFields[child.localName];
    if (field) {
      self[field[1]] (child, point, field[0]);
    } else if (child.localName === 'link') {
      self._link (child, point);
    } else if (child.localName === 'extensions') {
      Array.prototype.forEach.call (child.childNodes, function (gc) {
        var field = self._pointExtFields[gc.localName];
        if (field) {
          self[field[1]] (gc, point, field[0]);
        } else if (gc.localName === 'TrackPointExtension') {
          Array.prototype.forEach.call (gc.childNodes, function (ggc) {
            var field = self._pointTPExtFields[ggc.localName];
            if (field) {
              self[field[1]] (ggc, point, field[0]);
            }
          });
        }
      });
    } 
  });
  return point;
}; // _point

GPXParser.prototype._route = function (el) {
  var self = this;
  var route = {points: [], links: []};
  Array.prototype.forEach.call (el.childNodes, function (child) {
    var field = self._routeFields[child.localName];
    if (field) {
      self[field[1]] (child, route, field[0]);
    } else if (child.localName === 'rtept') {
      route.points.push (self._point (child));
    } else if (child.localName === 'link') {
      self._link (child, route);
    } 
  });
  return route;
}; // _route

GPXParser.prototype._track = function (el) {
  var self = this;
  var track = {segments: [], links: []};
  Array.prototype.forEach.call (el.childNodes, function (child) {
    var field = self._trackFields[child.localName];
    if (field) {
      self[field[1]] (child, track, field[0]);
    } else if (child.localName === 'trkseg') {
      var segment = {points: []};
      Array.prototype.forEach.call (child.childNodes, function (gc) {
        if (gc.localName === 'trkpt') {
          segment.points.push (self._point (gc));
        }
      });
      track.segments.push (segment);
    } else if (child.localName === 'link') {
      self._link (child, track);
    }
  });
  return track;
}; // _track

GPXParser.prototype._latValue = function (s) {
  var n = this._numberValue (s);
  if (n != null && -90 <= n && n <= 90) {
    return n;
  } else {
    return null;
  }
}; // _latValue

GPXParser.prototype._lonValue = function (s) {
  var n = this._numberValue (s);
  if (n != null && -180 <= n && n <= 180) {
    return n;
  } else {
    return null;
  }
}; // _lonValue

GPXParser.prototype._numberValue = function (s) {
  if (s == null) return;
  var m = s.match (/^[\x09\x0A\x0C\x0D\x20]*([+-]?[0-9]*(?:\.[0-9]+|)(?:[Ee][+-]?[0-9]+|))/);
  if (m) {
    return parseFloat (m[1]);
  } else {
    return null;
  }
}; // _numberValue

GPXParser.prototype._string = function (el, obj, key) {
  if (obj[key] != null) return;
  var text = this._childText (el);
  if (text !== "") obj[key] = text;
}; // _string

GPXParser.prototype._nnnumber = function (el, obj, key) {
  if (obj[key] != null) return;
  var text = this._childText (el);
  var m = text.match (/^[\x09\x0A\x0C\x0D\x20]*([+-]?[0-9]+)/);
  if (m) {
    obj[key] = parseInt (m[1]);
  } else {
    return;
  }
}; // _nnnumber

GPXParser.prototype._number = function (el, obj, key) {
  if (obj[key] != null) return;
  obj[key] = this._numberValue (this._childText (el));
}; // _number

GPXParser.prototype._degree = function (el, obj, key) {
  if (obj[key] != null) return;
  var n = this._numberValue (this._childText (el));
  if (0 <= n && n <= 360) {
    obj[key] = n;
  } else {
    return;
  }
}; // _degree

GPXParser.prototype._year = function (el, obj, key) {
  if (obj[key] != null) return;
  var text = this._childText (el);
  if (/^[0-9]{4,}$/.test (text)) {
    var n = parseInt (text);
    if (n > 0) {
      obj[key] = n;
    }
    return;
  } else {
    return;
  }
}; // _year

GPXParser.prototype._time = function (el, obj, key) {
  if (obj[key] != null) return;
  obj[key] = this._globalDT (this._childText (el));
}; // _time

GPXParser.prototype._link = function (el, obj) {
  var self = this;
  var v = {};
  var url = this._url (el, v, 'url');
  if (!v.url) return;
  Array.prototype.forEach.call (el.childNodes, function (child) {
    if (child.localName === 'text') {
      self._string (child, v, 'text');
    } else if (child.localName === 'type') {
      self._string (child, v, 'mime_type');
    }
  });
  obj.links.push (v);
}; // _link

GPXParser.prototype._url = function (el, obj, key) {
  if (obj[key] != null) return;
  var href = el.getAttribute ('href');
  if (href != null) {
    try {
      var url = new URL (href, this.baseURL);
      obj[key] = url.href;
    } catch (e) {
      return;
    }
  } else {
    return;
  }
}; // _url

GPXParser.prototype._urlContent = function (el, obj, key) {
  if (obj[key] != null) return;
  var href = this._childText (el);
  if (href != null && href !== "") {
    try {
      var url = new URL (href, this.baseURL);
      obj[key] = url.href;
    } catch (e) {
      return;
    }
  } else {
    return;
  }
}; // _urlContent

GPXParser.prototype._person = function (el, obj, key) {
  if (obj[key] != null) return;
  var self = this;
  var person = {links: []};
  Array.prototype.forEach.call (el.childNodes, function (child) {
    if (child.localName === 'name') {
      self._string (child, person, 'name');
    } else if (child.localName === 'link') {
      self._link (child, person);
    } else if (child.localName === 'email') {
      if (person.email == null) {
        var left = child.getAttribute ('id');
        var right = child.getAttribute ('domain');
        if (left != null && right != null) {
          person.email = left + "@" + right;
        }
      }
    }
  });
  obj[key] = person;
}; // _person

GPXParser.prototype._license = function (el, obj, key) {
  if (obj[key] != null) return;
  var self = this;
  var license = {};
  var holder = el.getAttribute ('author');
  if (holder != null && holder !== '') {
    license.holder = holder;
  }
  Array.prototype.forEach.call (el.childNodes, function (child) {
    if (child.localName === 'year') {
      self._year (child, license, 'year');
    } else if (child.localName === 'license') {
      self._urlContent (child, license, 'url');
    }
  });
  obj[key] = license;
}; // _license

GPXParser.prototype._globalDT = function (s) {
  if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}[T ][0-9]{2}:[0-9]{2}(?::[0-9]{2}(?:\.[0-9]+|)|)(?:Z|[+-](?:[01][0-9]|2[0-3]):?[0-5][0-9])$/.test (s)) {
    return new Date (s).valueOf () / 1000;
  } else {
    return null;
  }
}; // _globalDT

GPXParser.prototype._tzOffset = function (s) {
  var m = s.match (/^([+-])([01][0-9]|2[0-3]):?([0-5][0-9])$/);
  if (m) {
    var v = parseInt (m[2]) * 60 + parseInt (m[3]);
    if (m[1] === '-') v = -v;
    return v * 60;
  } else if (s === 'Z') {
    return 0;
  } else {
    return null;
  }
}; // _tzOffset

GPXParser.prototype._childText = function (el) {
  return Array.prototype.map.call (el.childNodes, function (child) {
    if (child.nodeType === child.TEXT_NODE ||
        child.nodeType === child.CDATA_SECTION_NODE) {
      return child.data;
    } else {
      return '';
    }
  }).join ('');
}; // _childText

/* License

Copyright 2016-2018 Wakaba <wakaba@suikawiki.org>.

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or (at
your option) any later version.

This program is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; see the file COPYING.  If not, write to the
Free Software Foundation, Inc., 59 Temple Place - Suite 330, Boston,
MA 02111-1307, USA.

*/
