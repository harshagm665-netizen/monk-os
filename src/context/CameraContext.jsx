import React, { createContext, useContext, useState, useRef } from 'react';

// Create the unified Context
const CameraContext = createContext(null);

export const useCamera = () => {
    const context = useContext(CameraContext);
    if (!context) {
        throw new Error("useCamera must be used within a CameraProvider");
    }
    return context;
};

export const CameraProvider = ({ children }) => {
    const [stream, setStream] = useState(null);
    const [cameraError, setCameraError] = useState(null);
    const [isInitializing, setIsInitializing] = useState(false);

    // Use a Ref to track the number of apps actively requesting the camera
    const activeAppCount = useRef(0);

    const requestCamera = async () => {
        activeAppCount.current += 1;

        // Only initialize the hardware on the first app request
        if (activeAppCount.current === 1) {
            setIsInitializing(true);
            setCameraError(null);

            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error("HTTPS_REQUIRED");
                }

                const newStream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480, facingMode: 'user' }
                });

                setStream(newStream);
            } catch (err) {
                console.error("[Camera Manager] Failed to acquire stream:", err);

                // Categorize error for the Diagnostic Agent
                let errorObj = { type: 'UNKNOWN', message: err.message };

                if (err.message === "HTTPS_REQUIRED") {
                    errorObj = {
                        type: 'SECURITY_BLOCK',
                        message: 'Camera API requires a Secure Context (HTTPS or localhost).'
                    };
                } else if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
                    errorObj = {
                        type: 'PERMISSION_DENIED',
                        message: 'Camera permission was blocked by the browser.'
                    };
                } else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
                    errorObj = {
                        type: 'NO_HARDWARE',
                        message: 'No supported webcam hardware was detected.'
                    };
                } else if (err.name === 'NotReadableError') {
                    errorObj = {
                        type: 'HARDWARE_IN_USE',
                        message: 'The webcam is currently being used by another application (e.g. Zoom).'
                    }
                }

                setCameraError(errorObj);
                activeAppCount.current = 0; // Reset count since hardware failed
            } finally {
                setIsInitializing(false);
            }
        }
    };

    const releaseCamera = () => {
        if (activeAppCount.current > 0) {
            activeAppCount.current -= 1;
        }

        // When the last app closes, shut down the hardware light
        if (activeAppCount.current === 0 && stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    // Provide the dynamic stream controller to all apps
    return (
        <CameraContext.Provider value={{ stream, cameraError, isInitializing, requestCamera, releaseCamera }}>
            {children}
        </CameraContext.Provider>
    );
};
