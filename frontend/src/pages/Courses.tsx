import React from "react";

export const Courses: React.FC = () => {
  return (
    <section className="inner-page">
      <header className="inner-page__header">
        <h1>Features & Capabilities</h1>
        <p>
          Explore the deep learning models, explainable AI methods, and dataset
          information that power this histology analysis platform.
        </p>
      </header>
      <div className="inner-grid">
        <div className="course-card">
          <p className="course-card__label">RESNET50</p>
          <h2 className="course-card__title">
            Residual network architecture
          </h2>
          <p className="course-card__body">
            Deep convolutional network with residual connections, optimized for
            histology image classification with 50 layers of feature extraction.
          </p>
          <button className="course-card__cta" type="button">
            VIEW MODEL
          </button>
        </div>
        <div className="course-card">
          <p className="course-card__label">MOBILENETV2</p>
          <h2 className="course-card__title">Lightweight mobile architecture</h2>
          <p className="course-card__body">
            Efficient depthwise separable convolutions designed for fast
            inference while maintaining high accuracy on histology tissue
            classification tasks.
          </p>
          <button className="course-card__cta" type="button">
            VIEW MODEL
          </button>
        </div>
        <div className="course-card">
          <p className="course-card__label">EFFICIENTNETB3</p>
          <h2 className="course-card__title">Compound scaling optimization</h2>
          <p className="course-card__body">
            Balanced scaling of depth, width, and resolution for optimal
            performance on colorectal histology classification with efficient
            resource usage.
          </p>
          <button className="course-card__cta" type="button">
            VIEW MODEL
          </button>
        </div>
        <div className="course-card">
          <p className="course-card__label">DENSENET121</p>
          <h2 className="course-card__title">Dense connectivity pattern</h2>
          <p className="course-card__body">
            Densely connected convolutional layers that maximize feature reuse
            and gradient flow for improved histology tissue classification
            accuracy.
          </p>
          <button className="course-card__cta" type="button">
            VIEW MODEL
          </button>
        </div>
        <div className="course-card">
          <p className="course-card__label">GRAD-CAM</p>
          <h2 className="course-card__title">Gradient-weighted activation maps</h2>
          <p className="course-card__body">
            Visualize which regions of the histology image contribute most to
            the model&apos;s classification decision using gradient-based
            attention visualization.
          </p>
          <button className="course-card__cta" type="button">
            TRY IT
          </button>
        </div>
        <div className="course-card">
          <p className="course-card__label">LIME</p>
          <h2 className="course-card__title">Local interpretable explanations</h2>
          <p className="course-card__body">
            Understand model predictions by approximating the decision boundary
            locally around individual histology samples using interpretable
            linear models.
          </p>
          <button className="course-card__cta" type="button">
            TRY IT
          </button>
        </div>
        <div className="course-card">
          <p className="course-card__label">SHAP</p>
          <h2 className="course-card__title">SHapley Additive exPlanations</h2>
          <p className="course-card__body">
            Game-theory based feature attribution method using GradientShap to
            explain how each pixel contributes to the final classification
            prediction.
          </p>
          <button className="course-card__cta" type="button">
            TRY IT
          </button>
        </div>
        <div className="course-card">
          <p className="course-card__label">KATHER DATASET</p>
          <h2 className="course-card__title">Colorectal histology tiles</h2>
          <p className="course-card__body">
            Trained on the Kather colorectal histology dataset with 8 tissue
            classes: Adipose, Background, Debris, Lymphocytes, Mucus, Smooth
            Muscle, Normal Colon, and Cancer-associated Stroma.
          </p>
          <button className="course-card__cta" type="button">
            LEARN MORE
          </button>
        </div>
      </div>
    </section>
  );
};


