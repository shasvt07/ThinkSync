import { PromptImageInputProps, CursorMode } from "@/types/type";
import CursorSVG from "@/public/assets/CursorSVG";
import { useEffect, useRef } from "react";
import { fabric } from "fabric";
import { initializeFabric } from "@/lib/canvas";
import { useMutation } from "@/liveblocks.config";
import { v4 as uuidv4 } from "uuid";
import { getJson } from "serpapi";
import axios from "axios";
import { handleImageUpload } from "@/lib/shapes";

export type InputImagUrl = {
  imageUrl: string;
  canvas: fabric.Canvas;
};
const PromptImageInput = ({
  cursor,
  cursorState,
  setCursorState,
  updateMyPresence,
  fabricRef,
  canvasRef,
}: PromptImageInputProps) => {
  const shapeRef = useRef<fabric.Object | null>(null);
  const syncShapeInStorage = useMutation(({ storage }, object) => {
    // if the passed object is null, return
    if (!object) return;
    const { objectId } = object;

    /**
     * Turn Fabric object (kclass) into JSON format so that we can store it in the
     * key-value store.
     */
    const shapeData = object.toJSON();
    shapeData.objectId = objectId;

    const canvasObjects = storage.get("canvasObjects");
    /**
     * set is a method provided by Liveblocks that allows you to set a value
     *
     * set: https://liveblocks.io/docs/api-reference/liveblocks-client#LiveMap.set
     */
    canvasObjects.set(objectId, shapeData);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateMyPresence({ message: e.target.value });
    setCursorState({
      mode: CursorMode.PromptImage,
      message: e.target.value,
    });
  };

  const handleImageUpload = (imageUrl: string) => {
    fabric.Image.fromURL(imageUrl as string, (img) => {
      img.scaleToWidth(200);
      img.scaleToHeight(200);
      img.top = cursor.y;
      img.left = cursor.x;
      fabricRef.current?.add(img);

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const image = new Image();
      image.src = imageUrl;

      image.onload = () => {
        ctx?.drawImage(image, 0, 0);
      };

      // @ts-ignore
      img.objectId = uuidv4();

      shapeRef.current = img;

      syncShapeInStorage(img);
      fabricRef.current?.requestRenderAll();
    });
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (
        cursorState.mode === CursorMode.PromptImage &&
        cursorState.message !== ""
      ) {
        try {
          const response = await axios.post(
            process.env.NEXT_PUBLIC_IMAGE_GENERATE_API as string,
            {
              prompt: cursorState.message,
            }
          );
          handleImageUpload(response.data);
        } catch (error) {
          console.error("Error generating image:", error);
        }
      }

      setCursorState({
        mode: CursorMode.PromptImage,
        message: "",
      });
    } else if (e.key === "Escape") {
      setCursorState({
        mode: CursorMode.Hidden,
      });
    }
  };

  return (
    <div
      className='absolute left-0 top-0'
      style={{
        transform: `translateX(${cursor.x}px) translateY(${cursor.y}px)`,
      }}
    >
      {/* Show message input when cursor is in chat mode */}
      {cursorState.mode === CursorMode.PromptImage && (
        <>
          {/* Custom Cursor shape */}
          {/* <CursorSVG color='#000' /> */}

          <div
            className='absolute left-2 top-5 bg-blue-500 px-4 py-2 text-sm leading-relaxed text-white'
            onKeyUp={(e) => e.stopPropagation()}
            style={{
              borderRadius: 20,
            }}
          >
            {/**
             * if there is a previous message, show it above the input
             *
             * We're doing this because when user press enter, we want to
             * show the previous message at top and the input at bottom
             */}
            {/* {cursorState.previousMessage && (
              <div>{cursorState.previousMessage}</div>
            )} */}
            <input
              className='z-10 w-60 border-none	bg-transparent text-white placeholder-blue-300 outline-none'
              autoFocus={true}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={"Spawn a image"}
              value={cursorState.message}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default PromptImageInput;
