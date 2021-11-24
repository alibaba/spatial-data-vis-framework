using System;

namespace Ali.Polaris.Projections
{
    // 投影类型
    public enum ProjectionType
    {
        MercatorProjection,
        GeocentricProjection,
        GallStereoGraphicProjection,
        AzimuthalEquidistantProjection,
        EquirectangularProjection
    }

    // 长度单位
    public enum ProjectionUnits
    {
        kilometers,
        meters
    }

    // 投影描述
    public struct ProjectionDesc
    {
        public string type;
        public string orientation;
        public string units;
        public double[] center;
    }

    // 初始化参数
    public struct ProjectionProps
    {
        public string orientation;
        public string units;
        public double[] center;
    }

    // Exceptions
    public class WrongDescException : Exception { public WrongDescException(string msg) { } }
    public class WrongPropsException : Exception { public WrongPropsException(string msg) { } }


    // 基类
    public abstract class Projection
    {
        // constants
        protected const double MAX_LATITUDE = 85.05112877980659;
        protected const double DEG2RAD = Math.PI / 180d;
        protected const double R = 6378137d;

        // units scale
        protected double scale = 1d;

        // desc
        public string Type { get; protected set; } = "Projection"; // 兼容JS，其实没啥用
        public string Orientation { get; protected set; }
        public string Units { get; protected set; }

        public virtual bool IsPlaneProjection { get; protected set; } = false;
        public virtual bool IsShpereProjection { get; protected set; } = false;
        public virtual bool IsGeocentricProjection { get; protected set; } = false;

        protected bool _useRightHand = false;

        public virtual double[] Center { get; set; } = { 0d, 0d, 0d };

        protected Projection(ProjectionProps props)
        {
            // default values
            if (props.orientation == null)
            {
                props.orientation = "right";
            }
            if (props.units == null)
            {
                props.units = "meters";
            }
            if (props.center == null)
            {
                props.center = new double[] { 0d, 0d, 0d };
            }

            Center = props.center;
            Units = props.units;
            Orientation = props.orientation;
            _useRightHand = Orientation == "right";

            // 单位转换
            if (Units == "kilometers")
            {
                scale = 0.001d;
            }
            else if (Units == "meters")
            {
                scale = 1d;
            }
        }

        // lnglatalt to xyz
        public abstract double[] Project(double lng, double lat, double alt = 0d);
        // xyz to lnglatalt
        public abstract double[] Unproject(double x, double y, double z = 0d);

        // 输入输出调节，计算过程中全部使用 右手系，以米为单位
        protected double[] TransformOut(double x, double y, double z = 0d)
        {
            if (this._useRightHand)
            {
                return new double[] { x * scale, y * scale, z * scale };
            }
            else
            {
                return new double[] { x * scale, z * scale, y * scale };
            }
        }

        protected void TransformIn(ref double x, ref double y, ref double z)
        {
            if (!this._useRightHand)
            {
                var tmp = z;
                z = y;
                y = tmp;
            }

            x /= scale;
            y /= scale;
            z /= scale;
        }

        // 生成描述
        public string ToDesc()
        {
            //  0 version | 1 Type | 2 Orientation | 3 Units | 4 Center
            return $"desc0|{Type}|{Orientation}|{Units}|{Center[0]},{Center[1]},{(Center.Length > 2 ? Center[2] : 0d)}";
        }

        // 从描述创建实例
        static public Projection FromDesc(string str)
        {
            try
            {
                string[] desc = str.Split('|');
                var version = desc[0];
                var type = desc[1];
                var orientation = desc[2];
                var units = desc[3];
                var centerStr = desc[4];
                string[] centerLLA = centerStr.Split(',');
                double[] center = {
                    Double.Parse(centerLLA[0]),
                    Double.Parse(centerLLA[1]),
                    Double.Parse(centerLLA[2]),
                };

                return Create(type, center, units, orientation);
            }
            catch (Exception)
            {
                throw new WrongDescException("Failed to parse the desc: " + str);
            }
        }

        // 工厂函数
        public static Projection Create(ProjectionType type, double[] center, ProjectionUnits units = ProjectionUnits.meters, string orientation = "right")
        {
            return Create(type.ToString(), center, units.ToString(), orientation);
        }

        public static Projection Create(string type, double[] center, string units = "meters", string orientation = "right")
        {
            ProjectionProps projectionProps = new ProjectionProps
            {
                orientation = orientation,
                units = units,
                center = center
            };

            try
            {
                switch (type)
                {
                    case "GeocentricProjection":
                        return new GeocentricProjection(projectionProps);
                    case "EquirectangularProjection":
                        return new EquirectangularProjection(projectionProps);
                    case "AzimuthalEquidistantProjection":
                        return new AzimuthalEquidistantProjection(projectionProps);
                    case "GallStereoGraphicProjection":
                        return new GallStereoGraphicProjection(projectionProps);
                    case "SphereProjection":
                        return new SphereProjection(projectionProps);
                    case "MercatorProjection":
                        return new MercatorProjection(projectionProps);
                    default:
                        throw new Exception();
                }
            }
            catch (Exception)
            {
                throw new WrongPropsException("Failed to create projection from props.");
            }
        }
    }
}