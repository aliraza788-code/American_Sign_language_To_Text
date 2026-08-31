/**
 * App.jsx
 * =======
 * Poori app ka SABSE UPAR wala component. Filhaal isme sirf ek hi
 * hissa hai (CameraFeed), lekin agar kal koi aur badi cheez add karni
 * ho (jaise ek "Settings page", ya "About" section), wo bhi yahan se
 * control hogi.
 */

import "./styles/index.css";
import CameraFeed from "./components/CameraFeed";

export default function App() {
  return (
    <div className="page">
      <CameraFeed />
    </div>
  );
}