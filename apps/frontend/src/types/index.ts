/**
 * Local type definitions for the frontend
 * These mirror the types from @nagarik/types package
 */

// Gender type
export type Gender = 'Male' | 'Female' | 'Other';

// Nepal districts
export type NepalDistrict =
    | 'Achham' | 'Arghakhanchi' | 'Baglung' | 'Baitadi' | 'Bajhang' | 'Bajura'
    | 'Banke' | 'Bara' | 'Bardiya' | 'Bhaktapur' | 'Bhojpur' | 'Chitwan'
    | 'Dadeldhura' | 'Dailekh' | 'Dang' | 'Darchula' | 'Dhading' | 'Dhankuta'
    | 'Dhanusa' | 'Dolakha' | 'Dolpa' | 'Doti' | 'Gorkha' | 'Gulmi' | 'Humla'
    | 'Ilam' | 'Jajarkot' | 'Jhapa' | 'Jumla' | 'Kailali' | 'Kalikot' | 'Kanchanpur'
    | 'Kapilvastu' | 'Kaski' | 'Kathmandu' | 'Kavrepalanchok' | 'Khotang' | 'Lalitpur'
    | 'Lamjung' | 'Mahottari' | 'Makwanpur' | 'Manang' | 'Morang' | 'Mugu' | 'Mustang'
    | 'Myagdi' | 'Nawalpur' | 'Nuwakot' | 'Okhaldhunga' | 'Palpa' | 'Panchthar'
    | 'ParbatDistrict' | 'Parsa' | 'Pyuthan' | 'Ramechhap' | 'Rasuwa' | 'Rautahat'
    | 'Rolpa' | 'Rukum' | 'Rupandehi' | 'Salyan' | 'Sankhuwasabha' | 'Saptari'
    | 'Sarlahi' | 'Sindhuli' | 'Sindhupalchok' | 'Siraha' | 'Solukhumbu' | 'Sunsari'
    | 'Surkhet' | 'Syangja' | 'Tanahu' | 'Taplejung' | 'Terhathum' | 'Udayapur';

// Face capture types
export type CaptureAngle = 'front' | 'left' | 'right';
export type FaceCaptureState = 'idle' | 'positioning' | 'ready' | 'capturing' | 'processing' | 'completed' | 'error';

// 128-dimensional face descriptor
export type FaceDescriptor128 = number[];

// Face descriptors for all three angles
export interface FaceDescriptors {
    front: number[];
    left: number[];
    right: number[];
}

// Face images (base64 encoded)
export interface FaceImages {
    front?: string;
    left?: string;
    right?: string;
}

// Citizen registration input
export interface CitizenRegistrationInput {
    fullName: string;
    citizenshipNumber: string;
    dateOfBirth: string;
    gender: Gender;
    district: NepalDistrict;
    municipality: string;
    wardNumber: number;
    phoneNumber?: string;
    faceDescriptors: FaceDescriptors;
    faceImages?: FaceImages;
}

// API request/response types
export interface RegistrationRequest {
    fullName: string;
    citizenshipNumber: string;
    dateOfBirth: string;
    gender: Gender;
    district: NepalDistrict;
    municipality: string;
    wardNumber: number;
    phoneNumber?: string;
    faceDescriptors: FaceDescriptors;
    faceImages?: FaceImages;
}

export interface RegistrationResponse {
    success: boolean;
    data?: {
        citizenId: string;
        fullName: string;
        citizenshipNumber: string;
        isVoterEligible: boolean;
        registeredAt: string;
    };
    error?: string;
    message?: string;
}

export interface VerifyIdentityRequest {
    citizenshipNumber: string;
    faceDescriptor: number[];
}

export interface VerifyIdentityResponse {
    success: boolean;
    verified: boolean;
    confidence?: number;
    citizen?: {
        fullName: string;
        citizenshipNumber: string;
        isVoterEligible: boolean;
    };
    error?: string;
}

export interface LivenessVerificationRequest {
    citizenshipNumber: string;
    faceDescriptors: {
        front: number[];
        left: number[];
        right: number[];
    };
}

export interface LivenessVerificationResponse {
    success: boolean;
    verified: boolean;
    isLive: boolean;
    confidence?: number;
    error?: string;
}

export interface DuplicateCheckRequest {
    faceDescriptor: number[];
    excludeCitizenId?: string;
}

export interface DuplicateCheckResponse {
    success: boolean;
    isDuplicate: boolean;
    matchedCitizen?: {
        citizenId: string;
        fullName: string;
        similarity: number;
    };
    error?: string;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
