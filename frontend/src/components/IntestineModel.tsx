import React from "react";

export const IntestineModel: React.FC = () => {
  return (
    <div className="intestine-model-container">
      <div className="sketchfab-embed-wrapper">
        <iframe
          title="Small and large intestine"
          src="https://sketchfab.com/models/8a1ca8e3ca224cdeb9264674416bde38/embed"
          frameBorder={0}
          allowFullScreen
          allow="autoplay; fullscreen; xr-spatial-tracking"
          className="sketchfab-embed-iframe"
          // @ts-ignore - Custom attributes for Sketchfab embed
          mozallowfullscreen="true"
          webkitallowfullscreen="true"
          xr-spatial-tracking="true"
          execution-while-out-of-viewport="true"
          execution-while-not-rendered="true"
          web-share="true"
        />
        <p className="sketchfab-embed-attribution">
          <a
            href="https://sketchfab.com/3d-models/small-and-large-intestine-8a1ca8e3ca224cdeb9264674416bde38?utm_medium=embed&utm_campaign=share-popup&utm_content=8a1ca8e3ca224cdeb9264674416bde38"
            target="_blank"
            rel="nofollow"
          >
            Small and large intestine
          </a>{" "}
          by{" "}
          <a
            href="https://sketchfab.com/antonia.sundberg?utm_medium=embed&utm_campaign=share-popup&utm_content=8a1ca8e3ca224cdeb9264674416bde38"
            target="_blank"
            rel="nofollow"
          >
            antonia.sundberg
          </a>{" "}
          on{" "}
          <a
            href="https://sketchfab.com?utm_medium=embed&utm_campaign=share-popup&utm_content=8a1ca8e3ca224cdeb9264674416bde38"
            target="_blank"
            rel="nofollow"
          >
            Sketchfab
          </a>
        </p>
      </div>
    </div>
  );
};

