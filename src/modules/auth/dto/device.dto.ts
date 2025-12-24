import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class TrustedDeviceLoginDto {
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @IsString()
  @IsNotEmpty()
  mobileNo: string;

  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsString()
  @IsNotEmpty()
  deviceToken: string;
}

export class DeviceInfoDto {
  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsString()
  @IsOptional()
  deviceName?: string;

  @IsBoolean()
  @IsOptional()
  rememberDevice?: boolean;
}
