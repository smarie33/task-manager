"use client";

import React from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

type QuillEditorProps = {
  value: string;
  onChange: (val: string) => void;
};

const QuillEditor: React.FC<QuillEditorProps> = ({ value, onChange }) => {
  const modules = React.useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike", "blockquote", "code"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link", "image"],
        ["code-block"],
        ["clean"],
      ],
    }),
    []
  );

  const formats = React.useMemo(
    () => [
      "header",
      "bold",
      "italic",
      "underline",
      "strike",
      "blockquote",
      "code",
      "list",
      "bullet",
      "link",
      "image",
      "code-block",
    ],
    []
  );

  return (
    <ReactQuill theme="snow" value={value} onChange={onChange} modules={modules} formats={formats} />
  );
};

export default QuillEditor;