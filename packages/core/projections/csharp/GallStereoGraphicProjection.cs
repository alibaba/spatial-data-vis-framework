using System;

namespace Ali.Polaris.Projections
{
    public class GallStereoGraphicProjection : Projection
    {

        private double[] _xyz0 = new double[3];

        public override double[] Center
        {
            get => base.Center;
            set
            {
                base.Center = value;
                var r = projRaw(new double[] { value[0] * DEG2RAD, value[1] * DEG2RAD });
                _xyz0[0] = r[0];
                _xyz0[1] = r[1];
                _xyz0[2] = value.Length > 2 ? value[2] : 0d;
            }
        }

        public GallStereoGraphicProjection(ProjectionProps props) : base(props)
        {
            IsPlaneProjection = true;
            Type = "GallStereoGraphicProjection";
        }

        public override double[] Project(double lng, double lat, double alt = 0d)
        {
            if (lat > MAX_LATITUDE)
            {
                lat = MAX_LATITUDE;
            }
            else if (lat < -MAX_LATITUDE)
            {
                lat = -MAX_LATITUDE;
            }

            var xy = projRaw(new double[] { lng * DEG2RAD, lat * DEG2RAD });

            var x = (xy[0] - this._xyz0[0]) * R;
            var y = (xy[1] - this._xyz0[1]) * R;
            var z = alt - this._xyz0[2];


            return TransformOut(x, y, z);
        }

        public override double[] Unproject(double x, double y, double z = 0d)
        {
            TransformIn(ref x, ref y, ref z);

            var xy = new double[] { x / R + this._xyz0[0], y / R + this._xyz0[1] };
            var lnglat = unprojRaw(xy);

            return new double[] { lnglat[0] / DEG2RAD, lnglat[1] / DEG2RAD, z + this._xyz0[2] };
        }

        // raw

        protected static double[] projRaw(double[] lnglat)
        {
            return new double[] { lnglat[0] / 1.4142135623730951, 1.7071067811865476 * Math.Tan(0.5 * lnglat[1]) };
        }

        protected static double[] unprojRaw(double[] xy)
        {
            return new double[] { xy[0] * 1.4142135623730951, 2 * Math.Atan(xy[1] / 1.7071067811865476) };
        }
    }
}