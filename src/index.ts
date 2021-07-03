import { KaleidoscopeShader } from "./scripts/kaleidoscope";
import imageCity from "url:./images/bg/city.webp";

// This dude is cool:
// https://unsplash.com/photos/qJfznuTMAYA

const images = [
  imageCity
];

const app = async (document: Document, window: Window) => {
  const el = document.body;
  const shader = new KaleidoscopeShader(el, window);
  const image = window.location.hash?.slice(1) || images[0]
  await shader.setImage(image);
  shader.start();
};

app(document, window);
