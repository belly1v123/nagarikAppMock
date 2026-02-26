// Citizen-related types

import { FaceDescriptors, FaceImages } from './face';

export interface CitizenRecord {
    id: string;
    fullName: string;
    citizenshipNumber: string;
    citizenshipHash: string;
    dateOfBirth: string;
    gender: Gender;
    district: string;
    municipality: string;
    wardNumber: string;
    address?: string;
    phoneNumber: string;
    phoneHash: string;
    email?: string;
    faceDescriptorFront: number[];
    faceDescriptorLeft: number[];
    faceDescriptorRight: number[];
    faceImageFrontUrl?: string;
    faceImageLeftUrl?: string;
    faceImageRightUrl?: string;
    isVoterEligible: boolean;
    eligibilityReason?: string;
    isActive: boolean;
    isFlagged: boolean;
    flagReason?: string;
    registeredAt: Date;
    updatedAt: Date;
}

export type Gender = 'male' | 'female' | 'other';

export interface CitizenRegistrationInput {
    fullName: string;
    citizenshipNumber: string;
    dateOfBirth: string;
    gender: Gender;
    district: string;
    municipality: string;
    wardNumber: number;
    address?: string;
    phoneNumber: string;
    email?: string;
    faceDescriptors: FaceDescriptors;
    faceImages?: FaceImages;
}

export interface CitizenPublicInfo {
    citizenHash: string;
    fullName: string;
    isVoterEligible: boolean;
    district: string;
}

export interface CitizenListItem {
    id: string;
    fullName: string;
    district: string;
    isVoterEligible: boolean;
    isActive: boolean;
    isFlagged: boolean;
    registeredAt: Date;
}

export interface CitizenSearchParams {
    page?: number;
    limit?: number;
    search?: string;
    district?: string;
    eligible?: boolean;
    flagged?: boolean;
    active?: boolean;
}

// Nepal Districts (all 77)
export const NEPAL_DISTRICTS = [
    // Province 1
    'Bhojpur', 'Dhankuta', 'Ilam', 'Jhapa', 'Khotang', 'Morang', 'Okhaldhunga',
    'Panchthar', 'Sankhuwasabha', 'Solukhumbu', 'Sunsari', 'Taplejung', 'Terhathum', 'Udayapur',
    // Madhesh Province
    'Bara', 'Dhanusha', 'Mahottari', 'Parsa', 'Rautahat', 'Saptari', 'Sarlahi', 'Siraha',
    // Bagmati Province
    'Bhaktapur', 'Chitwan', 'Dhading', 'Dolakha', 'Kathmandu', 'Kavrepalanchok', 'Lalitpur',
    'Makwanpur', 'Nuwakot', 'Ramechhap', 'Rasuwa', 'Sindhuli', 'Sindhupalchok',
    // Gandaki Province
    'Baglung', 'Gorkha', 'Kaski', 'Lamjung', 'Manang', 'Mustang', 'Myagdi', 'Nawalpur',
    'Parbat', 'Syangja', 'Tanahun',
    // Lumbini Province
    'Arghakhanchi', 'Banke', 'Bardiya', 'Dang', 'Eastern Rukum', 'Gulmi', 'Kapilvastu',
    'Nawalparasi West', 'Palpa', 'Pyuthan', 'Rolpa', 'Rupandehi',
    // Karnali Province
    'Dailekh', 'Dolpa', 'Humla', 'Jajarkot', 'Jumla', 'Kalikot', 'Mugu', 'Salyan',
    'Surkhet', 'Western Rukum',
    // Sudurpashchim Province
    'Achham', 'Baitadi', 'Bajhang', 'Bajura', 'Dadeldhura', 'Darchula', 'Doti',
    'Kailali', 'Kanchanpur'
] as const;

export type NepalDistrict = typeof NEPAL_DISTRICTS[number];
