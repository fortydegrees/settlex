import NextImageModule from "next/image";

const BaseImage = NextImageModule?.default ?? NextImageModule;

const NextImage = ({ draggable = false, ...props }) => (
  <BaseImage {...props} draggable={draggable} />
);

export default NextImage;
