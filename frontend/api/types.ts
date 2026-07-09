export type ExecuteResponse = {
    status: string,
    message: string
};


export interface StatusResponse {
    status:  string;
    message: Message;
}

export interface Message {
    fullscreen:    number;
    stats:         { [key: string]: number };
    seek_sec:      number;
    apiversion:    number;
    currentplid:   number;
    time:          number;
    volume:        number;
    length:        number;
    random:        boolean;
    audiofilters:  Audiofilters;
    information:   Information;
    rate:          number;
    videoeffects:  Videoeffects;
    state:         string;
    loop:          boolean;
    version:       string;
    position:      number;
    audiodelay:    number;
    repeat:        boolean;
    subtitledelay: number;
    equalizer:     never[];
}

export interface Audiofilters {
    filter_0: string;
}

export interface Information {
    chapter:  number;
    chapters: number[];
    title:    number;
    category: Category;
    titles:   number[];
}

export interface Category {
    "Stream 0": Stream0;
    "Stream 1": Stream1;
    meta:       Meta;
    "Stream 2": Stream2;
}

export interface Stream0 {
    Frame_rate:        string;
    Buffer_dimensions: string;
    Description:       string;
    Orientation:       string;
    Type:              string;
    Video_resolution:  string;
    Codec:             string;
}

export interface Stream1 {
    Codec:       string;
    Description: string;
    Sample_rate: string;
    Language:    string;
    Type:        string;
}

export interface Stream2 {
    Codec:       string;
    Description: string;
    Type:        string;
}

export interface Meta {
    _STATISTICS_WRITING_APP:      string;
    NUMBER_OF_FRAMES:             string;
    BPS:                          string;
    title:                        string;
    _STATISTICS_TAGS:             string;
    NUMBER_OF_BYTES:              string;
    DURATION:                     string;
    filename:                     string;
    _STATISTICS_WRITING_DATE_UTC: Date;
}

export interface Videoeffects {
    hue:        number;
    saturation: number;
    contrast:   number;
    brightness: number;
    gamma:      number;
}


