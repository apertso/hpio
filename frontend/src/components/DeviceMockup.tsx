import React from "react";

interface DeviceMockupProps {
  type: "mobile" | "desktop";
  src: string;
  alt: string;
  className?: string;
}

export const DeviceMockup: React.FC<DeviceMockupProps> = ({
  type,
  src,
  alt,
  className = "",
}) => {
  if (type === "mobile") {
    // Image dimensions: 1082 x 2402 (~0.45 aspect ratio)
    return (
      <div
        className={`relative mx-auto ${className}`}
        style={{ maxWidth: "300px" }}
      >
        {/* Modern Phone Frame */}
        <div className="relative rounded-[3rem] bg-gray-900 shadow-[0_0_4px_2px_rgba(255,255,255,0.1)_inset,0_25px_50px_-12px_rgba(0,0,0,0.5)] border-[8px] border-gray-900 overflow-hidden h-full w-full">
          {/* Screen Container - maintain aspect ratio of the image */}
          <div className="relative w-full bg-white dark:bg-gray-800 rounded-[2.5rem] overflow-hidden">
            {/*
                The image itself will determine the height if we don't force it.
                Alternatively, we can use aspect-ratio.
                1082 / 2402 ~= 0.45045...
             */}
            <img
              src={src}
              alt={alt}
              className="w-full h-auto block rounded-[2.5rem]"
              style={{ aspectRatio: "1082/2402" }}
            />
          </div>
          {/* Dynamic Island / Notch */}
          <div className="absolute top-2 inset-x-0 h-8 flex justify-center pointer-events-none">
            <div className="w-[30%] h-7 bg-black rounded-full"></div>
          </div>

          {/* Side Buttons */}
          <div className="absolute -left-[10px] top-24 h-10 w-[4px] bg-gray-800 rounded-l-md"></div>
          <div className="absolute -left-[10px] top-40 h-16 w-[4px] bg-gray-800 rounded-l-md"></div>
          <div className="absolute -right-[10px] top-32 h-20 w-[4px] bg-gray-800 rounded-r-md"></div>
        </div>
      </div>
    );
  }

  // Desktop dimensions: 1408 x 869
  return (
    <div className={`relative mx-auto ${className}`}>
      {/* Modern Monitor Frame */}
      <div className="relative group">
        {/* Screen Frame */}
        <div className="relative bg-gray-900 rounded-2xl p-2 shadow-2xl ring-1 ring-white/10 inline-block">
          <div className="relative rounded-xl overflow-hidden bg-gray-800">
            <img
              src={src}
              alt={alt}
              className="w-full h-auto block"
              style={{ aspectRatio: "1408/869" }}
            />
            {/* Reflection/Gloss effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none"></div>
          </div>
        </div>

        {/* Stand */}
        <div className="relative mx-auto w-[15%] h-4 sm:h-8 bg-gradient-to-b from-gray-800 to-gray-900 -mt-1 z-[-1] rounded-b-xl shadow-lg"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[20%] h-2 bg-gray-800/50 blur-md rounded-full translate-y-2"></div>
      </div>
    </div>
  );
};
