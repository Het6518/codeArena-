import "./Practical3Page.css";

const desktopImage =
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80";

const mobileImage =
  "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=600&q=80";

function Practical3Page() {
  return (
    <div className="practical3">
      <header className="responsive-header">
        <h1 >Practical 3 - Responsive Web Design</h1>
        <p>Resize the browser window to see the changes.</p>
      </header>

      <section className="responsive-section">
        <h2>1. Viewport Meta Tag</h2>

        <p>
          This page uses the viewport meta tag to make the webpage responsive
          on different devices.
        </p>

        <code>
          &lt;meta name="viewport" content="width=device-width,
          initial-scale=1.0" /&gt;
        </code>
      </section>

      <section className="responsive-section">
        <h2>2. Width and Max-Width</h2>

        <div className="max-width-box">
          This container uses width: 90% and max-width: 1000px.
        </div>
      </section>

      <section className="responsive-section">
        <h2>3. Responsive Image</h2>

        <p>
          The image changes according to the browser width.
        </p>

        <picture>
          <source media="(max-width: 600px)" srcSet={mobileImage} />
          <img
            className="responsive-image"
            src={desktopImage}
            alt="Responsive demonstration"
          />
        </picture>
      </section>

      <section className="responsive-section">
        <h2 className="vw-heading">4. Responsive Text Using VW</h2>

        <p>
          The heading above uses the CSS <strong>vw</strong> unit.
          Resize the browser to observe the change.
        </p>
      </section>

      <section className="responsive-section">
        <h2>5. Media Queries</h2>

        <div className="breakpoint-box">
          <span className="desktop-text">
            Desktop View
          </span>

          <span className="tablet-text">
            Tablet View
          </span>

          <span className="mobile-text">
            Mobile View
          </span>
        </div>
      </section>
    </div>
  );
}

export default Practical3Page;