using System;

namespace Ali.Polaris.Projections
{
    public class GeocentricProjection : SphereProjection
    {
        public override double[] Center
        {
            get => new double[3];
            set { }
        }

        public GeocentricProjection(ProjectionProps props) : base(props)
        {
            IsGeocentricProjection = true;
            Type = "GeocentricProjection";
        }
    }
}