import React from "react";

/**
 * @author
 * @function Price
 **/

const Price = (props) => {
  return (
    <div
      style={{
        fontSize: props.fontSize ? props.fontSize : "14px",
        fontWeight: "bold",
        margin: "5px 0",
      }}
    >
      <span style={{ marginRight: "2px" }}>Rs.</span>
      {Number(props.value || 0).toLocaleString("en-PK")}
    </div>
  );
};

export default Price;
