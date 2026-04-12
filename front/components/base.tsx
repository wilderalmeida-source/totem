import React,{ ReactElement } from "react"

export default function Base(props:ReactElement){
    
    return(
    <>
      <div className=" bg-background w-full h-screen flex flex-col">
        <div className="w-1/4 max-w-48">
        </div >
        {props.key}{props.props}
    </div>
    </>
    )
}