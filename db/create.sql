CREATE TABLE gps_raw_int (ref_usec INTEGER, time_usec INTEGER, lat INTEGER,lon INTEGER, alt INTEGER, eph REAL, epv REAL, vel REAL, cog REAL, fix_type INTEGER, satellites_visible INTEGER);
CREATE TABLE attitude (ref_usec INTEGER, time_boot_ms INTEGER, roll REAL, pitch REAL, yaw REAL, rollspeed REAL, pitchspeed REAL, yawspeed REAL);
CREATE TABLE vfr_hud (ref_usec INTEGER, airspeed REAL, groundspeed REAL, heading REAL, throttle REAL, alt REAL, climb REAL);

