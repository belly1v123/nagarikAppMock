/**
 * Pose Detection Utilities
 * 
 * Estimates head pose (yaw, pitch, roll) from face landmarks.
 */

import type { FaceLandmarks68 } from 'face-api.js';

export interface HeadPose {
    yaw: number;   // left-right rotation (-90 to 90)
    pitch: number; // up-down rotation (-90 to 90)
    roll: number;  // head tilt (-90 to 90)
}

/**
 * Estimate head pose from 68-point face landmarks
 * 
 * Uses geometric relationships between key points:
 * - Nose tip (point 30)
 * - Eye corners (points 36, 39, 42, 45)
 * - Chin (point 8)
 */
export function estimateHeadPose(landmarks: FaceLandmarks68): HeadPose {
    const positions = landmarks.positions;

    // Key landmark points
    const noseTip = positions[30];       // Nose tip
    const leftEyeOuter = positions[36];  // Left eye outer corner
    // Eye positions (indices 39, 42 available for advanced calculations)
    const rightEyeOuter = positions[45]; // Right eye outer corner
    const chin = positions[8];           // Chin

    // Calculate eye center
    const eyeCenterX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
    const eyeCenterY = (leftEyeOuter.y + rightEyeOuter.y) / 2;

    // Estimate YAW (left-right rotation)
    // Compare nose tip x-position to eye center
    const noseOffset = noseTip.x - eyeCenterX;
    const eyeWidth = rightEyeOuter.x - leftEyeOuter.x;
    const yaw = (noseOffset / (eyeWidth / 2)) * 45; // Scale to degrees

    // Estimate PITCH (up-down rotation)
    // Compare nose tip y-position to eye level and chin
    const faceHeight = chin.y - eyeCenterY;
    const noseYOffset = noseTip.y - eyeCenterY;
    const pitch = ((noseYOffset / faceHeight) - 0.4) * 90; // Normalize and scale

    // Estimate ROLL (head tilt)
    // Compare angle between eyes
    const eyeDeltaY = rightEyeOuter.y - leftEyeOuter.y;
    const eyeDeltaX = rightEyeOuter.x - leftEyeOuter.x;
    const roll = Math.atan2(eyeDeltaY, eyeDeltaX) * (180 / Math.PI);

    // Clamp values to reasonable ranges
    return {
        yaw: Math.max(-90, Math.min(90, yaw)),
        pitch: Math.max(-90, Math.min(90, pitch)),
        roll: Math.max(-90, Math.min(90, roll)),
    };
}

/**
 * Check if an eye is visible based on landmark positions
 * 
 * Left eye: points 36-41
 * Right eye: points 42-47
 */
export function isEyeVisible(
    landmarks: FaceLandmarks68,
    side: 'left' | 'right',
    frameWidth: number,
    frameHeight: number
): boolean {
    const positions = landmarks.positions;

    // Get eye landmark points
    const eyePoints = side === 'left'
        ? positions.slice(36, 42)  // Left eye
        : positions.slice(42, 48); // Right eye

    // Check if all points are within frame bounds
    const allInFrame = eyePoints.every(point =>
        point.x >= 0 && point.x <= frameWidth &&
        point.y >= 0 && point.y <= frameHeight
    );

    if (!allInFrame) return false;

    // Calculate eye aspect ratio (EAR)
    // EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
    // Values closer to 0 indicate closed/occluded eye
    const p1 = eyePoints[0]; // Outer corner
    const p2 = eyePoints[1];
    const p3 = eyePoints[2];
    const p4 = eyePoints[3]; // Inner corner
    const p5 = eyePoints[4];
    const p6 = eyePoints[5];

    const horizontalDist = Math.sqrt(
        Math.pow(p4.x - p1.x, 2) + Math.pow(p4.y - p1.y, 2)
    );

    const verticalDist1 = Math.sqrt(
        Math.pow(p2.x - p6.x, 2) + Math.pow(p2.y - p6.y, 2)
    );

    const verticalDist2 = Math.sqrt(
        Math.pow(p3.x - p5.x, 2) + Math.pow(p3.y - p5.y, 2)
    );

    const ear = (verticalDist1 + verticalDist2) / (2 * horizontalDist);

    // Eye is considered visible if EAR > 0.1
    return ear > 0.1;
}

/**
 * Check if face is looking at camera (front-facing)
 */
export function isFacingCamera(landmarks: FaceLandmarks68): boolean {
    const pose = estimateHeadPose(landmarks);

    return (
        Math.abs(pose.yaw) < 20 &&
        Math.abs(pose.pitch) < 20 &&
        Math.abs(pose.roll) < 15
    );
}

/**
 * Check if face is turned left
 */
export function isTurnedLeft(landmarks: FaceLandmarks68): boolean {
    const pose = estimateHeadPose(landmarks);
    return pose.yaw < -15;
}

/**
 * Check if face is turned right
 */
export function isTurnedRight(landmarks: FaceLandmarks68): boolean {
    const pose = estimateHeadPose(landmarks);
    return pose.yaw > 15;
}

/**
 * Get nose tip position as percentage of frame
 */
export function getNosePosition(
    landmarks: FaceLandmarks68,
    frameWidth: number,
    frameHeight: number
): { x: number; y: number } {
    const noseTip = landmarks.positions[30];

    return {
        x: noseTip.x / frameWidth,
        y: noseTip.y / frameHeight,
    };
}
