import React from "react";

export const About: React.FC = () => {
  return (
    <section className="inner-page">
      <header className="inner-page__header">
        <h1>About the Project</h1>
        <p>
          A research platform for colorectal cancer histology classification
          using ensemble deep learning models and explainable AI methods.
        </p>
      </header>

      <div className="inner-grid inner-grid--single">
        <div className="about-card">
          <h2>Project Overview</h2>
          <p>
            This platform combines four state-of-the-art convolutional neural
            networks (ResNet50, MobileNetV2, EfficientNetB3, and DenseNet121) in
            an ensemble approach to classify colorectal histology tissue samples.
            The system provides explainable AI visualizations using Grad-CAM,
            LIME, and SHAP to help researchers understand model predictions.
          </p>

          <h2 style={{ marginTop: "1.5rem" }}>Dataset</h2>
          <p>
            Models are trained on the Kather colorectal histology dataset,
            containing tissue tiles classified into 8 categories: Adipose,
            Background, Debris, Lymphocytes, Mucus, Smooth Muscle, Normal Colon
            Mucosa, and Cancer-associated Stroma. The dataset enables robust
            classification of colorectal tissue types.
          </p>

          <h2 style={{ marginTop: "1.5rem" }}>Architecture</h2>
          <p>
            The backend uses FastAPI to serve PyTorch models, while the frontend
            is built with React and TypeScript. The ensemble approach combines
            predictions from all four models for improved accuracy and
            robustness. Explainable AI methods provide visual insights into
            model decision-making processes.
          </p>

          <h2 style={{ marginTop: "1.5rem" }}>Get in touch</h2>
          <p>
            Interested in collaboration or have questions about the research?
            Send us a message and we&apos;ll get back to you.
          </p>
          <form
            className="contact-form"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <label>
              Name
              <input type="text" placeholder="Your name" />
            </label>
            <label>
              Email
              <input type="email" placeholder="you@example.com" />
            </label>
            <label>
              Message
              <textarea
                rows={4}
                placeholder="Tell us about your research interests or collaboration ideas"
              />
            </label>
            <button className="course-card__cta" type="submit">
              SEND MESSAGE
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};


