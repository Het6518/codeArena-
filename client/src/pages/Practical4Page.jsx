import { useState } from "react";
import "./Practical4Page.css";

function Practical4Page() {
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState("");

  const [name, setName] = useState("");
  const [storedName, setStoredName] = useState(
    localStorage.getItem("practical4-name") || ""
  );

  const [items, setItems] = useState([
    "HTML",
    "CSS",
    "JavaScript",
    "React",
  ]);

  const [draggedItem, setDraggedItem] = useState(null);
  const [droppedItems, setDroppedItems] = useState([]);

  const getLocation = () => {
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        setLocationError(error.message);
      }
    );
  };

  const saveToLocalStorage = () => {
    localStorage.setItem("practical4-name", name);
    setStoredName(name);
  };

  const removeFromLocalStorage = () => {
    localStorage.removeItem("practical4-name");
    setStoredName("");
    setName("");
  };

  const handleDragStart = (item) => {
    setDraggedItem(item);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = () => {
    if (!draggedItem) return;

    if (!droppedItems.includes(draggedItem)) {
      setDroppedItems((previous) => [...previous, draggedItem]);
    }

    setDraggedItem(null);
  };

  return (
    <div className="practical4">
      <header className="practical4-header">
        <h1>Practical 4 - Browser APIs</h1>
        <p>
          Demonstration of Geolocation, Local Storage and Drag & Drop APIs.
        </p>
      </header>

      <section className="api-card">
        <h2>1. Geolocation API</h2>

        <p>
          Click the button to retrieve the current latitude and longitude
          using the browser's Geolocation API.
        </p>

        <button onClick={getLocation}>
          Get My Location
        </button>

        {location && (
          <div className="result-box">
            <p>
              <strong>Latitude:</strong> {location.latitude}
            </p>

            <p>
              <strong>Longitude:</strong> {location.longitude}
            </p>
          </div>
        )}

        {locationError && (
          <p className="error-message">
            {locationError}
          </p>
        )}
      </section>

      <section className="api-card">
        <h2>2. Local Storage</h2>

        <p>
          Save a value in the browser's Local Storage and retrieve it after
          refreshing the page.
        </p>

        <div className="input-row">
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <button onClick={saveToLocalStorage}>
            Save
          </button>

          <button
            className="secondary-button"
            onClick={removeFromLocalStorage}
          >
            Remove
          </button>
        </div>

        <div className="result-box">
          <strong>Stored Value:</strong>{" "}
          {storedName || "Nothing stored"}
        </div>
      </section>

      <section className="api-card">
        <h2>3. Drag and Drop API</h2>

        <p>
          Drag any technology from the list and drop it into the drop zone.
        </p>

        <div className="drag-container">
          <div className="drag-list">
            <h3>Drag Items</h3>

            {items.map((item) => (
              <div
                key={item}
                className="drag-item"
                draggable
                onDragStart={() => handleDragStart(item)}
              >
                {item}
              </div>
            ))}
          </div>

          <div
            className="drop-zone"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <h3>Drop Here</h3>

            {droppedItems.length === 0 ? (
              <p>Drag an item here</p>
            ) : (
              droppedItems.map((item) => (
                <div key={item} className="dropped-item">
                  {item}
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Practical4Page;