using System;

namespace Ali.Polaris.Projections
{
    public class AzimuthalEquidistantProjection : Projection
    {
        private double[] _centerRad = new double[2];

        public override double[] Center
        {
            get => base.Center;
            set
            {
                base.Center = value;
                this._centerRad[0] = value[0] * DEG2RAD;
                this._centerRad[1] = value[1] * DEG2RAD;
            }
        }

        public AzimuthalEquidistantProjection(ProjectionProps props) : base(props)
        {
            IsPlaneProjection = true;
            Type = "AzimuthalEquidistantProjection";
        }

        public override double[] Project(double lng, double lat, double alt = 0d)
        {
            // 0度检查
            if (Math.Abs(lng - Center[0]) < 1e-6 && Math.Abs(lat - Center[1]) < 1e-6)
            {
                return new double[] { 0, 0, alt };
            }
            // @TODO  90度检查
            var φ = lat * DEG2RAD;
            var λ = lng * DEG2RAD;

            var φ0 = this._centerRad[1];
            var λ0 = this._centerRad[0];

            var sin_φ0 = Math.Sin(φ0);
            var sin_φ = Math.Sin(φ);
            var cos_φ0 = Math.Cos(φ0);
            var cos_φ = Math.Cos(φ);
            var cos_λ_λ0 = Math.Cos(λ - λ0);

            var c = Math.Acos(sin_φ0 * sin_φ + cos_φ0 * cos_φ * cos_λ_λ0);

            var k = c / Math.Sin(c);

            var x = R * k * cos_φ * Math.Sin(λ - λ0);
            var y = R * k * (cos_φ0 * sin_φ - sin_φ0 * cos_φ * cos_λ_λ0);

            return TransformOut(x, y, alt);
        }

        public override double[] Unproject(double x, double y, double z = 0d)
        {
            TransformIn(ref x, ref y, ref z);

            // 0度检查
            if (x == 0 && y == 0)
            {
                return new double[] { 0, 0, z };
            }
            // @TODO  90度检查

            x = x / R;
            y = y / R;


            var φ0 = this._centerRad[1];
            var λ0 = this._centerRad[0];

            var c = Math.Sqrt(x * x + y * y);

            var λ = λ0 + Math.Atan((x * Math.Sin(c)) / (c * Math.Cos(φ0) * Math.Cos(c) - y * Math.Sin(φ0) * Math.Sin(c)));

            var φ = Math.Asin(Math.Cos(c) * Math.Sin(φ0) + (y * Math.Sin(c) * Math.Cos(φ0)) / c);

            // console.log(
            // 	λ / DEG2RAD,
            // 	φ / DEG2RAD,
            // );

            return new double[] { λ / DEG2RAD, φ / DEG2RAD, z };
        }
    }
}