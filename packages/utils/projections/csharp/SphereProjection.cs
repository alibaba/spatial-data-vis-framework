using System;

namespace Ali.Polaris.Projections
{
    public class SphereProjection : Projection
    {
        private double[] _xyz0 = new double[3];

        public override double[] Center
        {
            get => base.Center;
            set
            {
                base.Center = value;
                var r = ProjRaw(new double[] { (90d - value[0]) * DEG2RAD, value[1] * DEG2RAD }, R);
                _xyz0[0] = r[0];
                _xyz0[1] = r[1];
                _xyz0[2] = r[2];
            }
        }

        public SphereProjection(ProjectionProps props) : base(props)
        {
            IsSphereProjection = true;
            Type = "SphereProjection";
        }

        public override double[] Project(double lng, double lat, double alt = 0d)
        {
            lng = 90d - lng;

            var xy = ProjRaw(new double[] { lng * DEG2RAD, lat * DEG2RAD }, R);

            var x = xy[0] - this._xyz0[0];
            var y = xy[1] - this._xyz0[1];
            var z = xy[2] - this._xyz0[2];


            return TransformOut(x, y, z);
        }

        public override double[] Unproject(double x, double y, double z = 0d)
        {
            TransformIn(ref x, ref y, ref z);
            throw new MissingMethodException("Method not implemented");
        }

        // raw

        protected static double[] ProjRaw(double[] lnglatalt, double R)
        {
            var phi = lnglatalt[0];
            var theta = lnglatalt[1];
            var alt = lnglatalt.Length > 2 ? lnglatalt[2] : 0d;

            var radius = R + alt;

            // console.log(phi, theta);

            return new double[] {
                radius * Math.Cos(phi) * Math.Cos(theta),
                radius * Math.Sin(theta),
                radius * Math.Sin(phi) * Math.Cos(theta)
            };
        }
    }
}