import math
import logging
import cv2
import numpy as np

logger = logging.getLogger(__name__)

class ShapeClassifierService:
    @staticmethod
    def classify_shape(contour: np.ndarray, x: int, y: int, width: int, height: int) -> dict:
        """
        Rule-Based shape classification of engineering symbols based on contour geometry.
        No machine learning model required. Uses aspect ratio, circularity, bounding box
        dimensions, and polygon vertex approximation.
        """
        area = float(cv2.contourArea(contour))
        perimeter = float(cv2.arcLength(contour, True))
        
        aspect_ratio = float(width) / float(height) if height > 0 else 0.0
        
        # Circularity: 4 * pi * area / perimeter^2 (approaching 1.0 for perfect circles)
        circularity = 0.0
        if perimeter > 0.0:
            circularity = (4.0 * math.pi * area) / (perimeter ** 2)
            
        # Polygon approximation to determine vertex count
        epsilon = 0.03 * perimeter
        approx = cv2.approxPolyDP(contour, epsilon, True)
        num_vertices = len(approx)

        logger.info(
            f"Analyzing contour geometry - Area: {area:.1f}, Perimeter: {perimeter:.1f}, "
            f"Aspect Ratio: {aspect_ratio:.2f}, Circularity: {circularity:.2f}, "
            f"Vertices: {num_vertices}"
        )

        # 1. Instrument: Small circles or squares (typically small bounding box)
        if (circularity > 0.70 or 0.8 <= aspect_ratio <= 1.2) and width < 45 and height < 45:
            logger.info("Classified shape as instrument")
            return {"shape_type": "instrument", "confidence": 0.90}

        # 2. Pump: Circles with medium-to-large size
        if circularity > 0.78 and (width >= 40 or height >= 40):
            logger.info("Classified shape as pump")
            return {"shape_type": "pump", "confidence": 0.85}

        # 3. Valve: Triangles or bowtie shapes (often low circularity, 5-7 vertices)
        if num_vertices == 3 or (5 <= num_vertices <= 7 and circularity < 0.55 and 0.5 <= aspect_ratio <= 2.0):
            logger.info("Classified shape as valve")
            return {"shape_type": "valve", "confidence": 0.80}

        # 4. Pressure Vessel: Capsule-like shapes, extremely vertical/horizontal orientations
        if aspect_ratio > 2.2 or aspect_ratio < 0.45:
            logger.info("Classified shape as pressure_vessel")
            return {"shape_type": "pressure_vessel", "confidence": 0.80}

        # 5. Heat Exchanger: Rectangular containing nested structures or multi-lines
        if 0.5 <= aspect_ratio <= 2.0 and num_vertices == 4:
            logger.info("Classified shape as heat_exchanger")
            return {"shape_type": "heat_exchanger", "confidence": 0.75}

        # 6. Car: Wide, rectangular bottom base, moderate vertex count
        if 1.4 <= aspect_ratio <= 3.0 and 5 <= num_vertices <= 8 and circularity < 0.6:
            logger.info("Classified shape as car")
            return {"shape_type": "car", "confidence": 0.65}

        # 7. Rabbit: Taller structure with vertical protrusions (ears)
        if 0.4 <= aspect_ratio <= 0.8 and 6 <= num_vertices <= 9 and circularity < 0.5:
            logger.info("Classified shape as rabbit")
            return {"shape_type": "rabbit", "confidence": 0.60}

        # 8. Ghost: Wavy base structure, round top (high vertices, moderate circularity)
        if 0.7 <= aspect_ratio <= 1.3 and 0.5 <= circularity <= 0.75 and num_vertices >= 8:
            logger.info("Classified shape as ghost")
            return {"shape_type": "ghost", "confidence": 0.60}

        # 9. Fallback: Unknown
        logger.info("Classified shape as unknown")
        return {"shape_type": "unknown", "confidence": 0.40}
