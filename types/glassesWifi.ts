export interface HelloGlassesWifi {
    whoiam: string;
}

export interface ConnectGlassesPayload {
    ssid: string;
    password: string;
}

export type ConnectGlassesResponse =
    | { data: string; error: null; }
    | { data: null; error: string; };

export interface DisconnectGlassesResponse {
    data: string;
    error: null;
}

export interface PostResolutionPayload {
    resolution: number
};



export type PostResolutionResponse =
    | { data: string; error: null; }
    | { data: null; error: string; };


export interface StartStreamPayload {
    ip: string;
    port: string;
}

export interface PostStartStreamResponse {
    data: string;
    error: null|string;
}

export interface StopStreamResponse {
    data: string;
    error: null|string;
}


export interface PostStartRangingResponse {
    data: string; 
    error: null|string;
}

export interface StopRangingResponse {
    data: string; 
    error: null|string;
  }

  export interface BtnResponse {
    time: number
  }