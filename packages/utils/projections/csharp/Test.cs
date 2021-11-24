using System;
using Ali.Polaris.Projections;

namespace Test
{
    class Program
    {
        static void Main(string[] args)
        {
            // Console.WriteLine("Hello World!");

            var values = new double[,]
            {
                {0d, 0d},
                {10d, 5d},
                {90d, 5d},
                {180d, 5d},
                {180d, 90d},
                {-180d, -90d},
            };

            for (int i = 0; i < 6; i++)
            {
                var center = new double[] { values[i, 0], values[i, 1] };

                var props = new ProjectionProps
                {
                    orientation = "right",
                    units = "kilometers",
                    center = center,
                };
                // var _proj = new MercatorProjection(props);
                var _proj = new AzimuthalEquidistantProjection(props);
                // var _proj = new EquirectangularProjection(props);
                // var _proj = new GallStereoGraphicProjection(props);
                // var _proj = new SphereProjection(props);
                var proj = Projection.FromDesc(_proj.ToDesc());

                Console.WriteLine($"=={center[0]},{center[1]}==");

                for (int j = 0; j < 6; j++)
                {
                    var xyz = proj.Project(values[j, 0], values[j, 1]);

                    Console.WriteLine($"{values[j, 0]},{values[j, 1]} => {xyz[0]},{xyz[1]},{xyz[2]}");
                }
            }
        }
    }
}
