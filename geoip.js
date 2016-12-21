var countries = [],
    midpoints = [],
    numcountries = 0;
var geoip = module.exports = {
    ready: false,

    lookup: function(ip) {

        if(!geoip.ready) {
            return { error: "GeoIP not ready" };
        }

        var ipl = iplong(ip);

        if(ipl == 0 || !ipl) {
          return { error: "Invalid ip address " + ip + " -> " + ipl + " as integer" };
        }

        return find(ipl);
    }
};

/**
* Prepare the data.  This uses the standard free GeoIP CSV database
* from MaxMind, you should be able to update it at any time by just
* overwriting GeoIPCountryWhois.csv with a new version.
*/
var fs = require("fs");
var sys = require("util");

var buffer = fs.readFileSync(__dirname + "/dbip-country.csv", 'utf-8');
var entries = buffer.toString().replace(/"/g, "").replace(/\r/g, "").split("\n");

for(var i=0; i<entries.length; i++) {
		var entry = entries[i].split(",");
		// ignore incorrect lines.
		if (entry && entry.length != 3) {
				continue;
		}
		// ignore ipv6 addresses.
		if (entry[0].indexOf(':') != -1) {
				continue;
		}
		var ipvals = entry[0].split('.');
		var ipstart = (parseInt(ipvals[0]) * 0xffffff) + (parseInt(ipvals[1]) << 16) + (parseInt(ipvals[2]) << 8) + parseInt(ipvals[3])

		countries.push({ipstart: ipstart, code: entry[2], name: entry[2]});
}

countries.sort(function(a, b) {
		return a.ipstart - b.ipstart;
});

var n = Math.floor(countries.length / 2);
while(n >= 1) {
		n = Math.floor(n / 2);
		midpoints.push(n);
}

numcountries = countries.length;
console.log('geoip ready')
geoip.ready = true;

function iplong(ip) {

    if(!ip) {
        return 0;
    }

    ip = ip.toString();

    if(isNaN(ip) && ip.indexOf(".") == -1) {
        return 0;
    }

    if(ip.indexOf(".") == -1) {

        try {
            ip = parseFloat(ip);
            return ip < 0 || ip > 4294967296 ? 0 : ip;
        }
        catch(s) {
        }
    }

    var parts = ip.split(".");

    if(parts.length != 4) {
        return 0;
    }

    var ipl = 0;

    for(var i=0; i<4; i++) {
        parts[i] = parseInt(parts[i], 10);

        if(parts[i] < 0 || parts[i] > 255) {
            return 0;
        }

        ipl += parts[3-i] * (Math.pow(256, i));
    }

    return ipl > 4294967296 ? 0 : ipl;
}

/**
 * A qcuick little binary search
 * @param ip the ip we're looking for
 * @return {*}
 */
function find(ipl) {

    var mpi = 0;
    var n = midpoints[0];
    var step;
    var current;
    var next;
    var prev;
    var nn;
    var pn;

    while(true) {

        step = midpoints[mpi];
        mpi++;
        current = countries[n];
        nn = n + 1;
        pn = n - 1;

        next = nn < numcountries ? countries[nn] : null;
        prev = pn > -1 ? countries[pn] : null;

		// take another step?
        if(step > 0) {

            if(!next || next.ipstart < ipl) {
                n += step;
            } else {
                n -= step;
            }

            continue;
        }

        // we're either current, next or previous depending on which is closest to ipl
				var cd = Math.abs(ipl - current.ipstart);
        var nd = next && next.ipstart< ipl ? ipl - next.ipstart : 1000000000;
        var pd = prev && prev.ipstart < ipl ? ipl - prev.ipstart : 1000000000;

        // current wins
        if(cd < nd && cd < pd) {
            return current;
        }

         // next wins
        if(nd < cd && nd < pd) {
            return next;

        }

        // prev wins
        return prev;
    }
}
