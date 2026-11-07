import { Injectable } from "@nestjs/common";
@Injectable() export class TraitementImagesService { async preparer(image: Buffer) { return { format: "webp", tailles: [image.length] }; } }
