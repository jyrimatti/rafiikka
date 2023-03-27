{-# LANGUAGE GADTs, DataKinds, FlexibleContexts, FlexibleInstances, TypeApplications, MultiParamTypeClasses, ScopedTypeVariables, DuplicateRecordFields, DeriveGeneric, RecordWildCards, OverloadedStrings #-}
{-# OPTIONS_GHC -Wno-orphans #-}

module Types where
import Universum
import Language.Javascript.JSaddle (FromJSVal(fromJSVal), ToJSVal, JSString, toJSVal_aeson, Object, listProps, FromJSString (fromJSString), JSM, getProp, MakeObject (makeObject))
import Monadic (doFromJSVal, propFromJSVal)
import Data.Time.Calendar (Day)
import Language.Javascript.JSaddle.Classes (ToJSVal(toJSVal))
import Yleiset ()
import Data.Aeson (FromJSON, ToJSON (toJSON), ToJSONKey)
import qualified Data.Map as Map
import GHC.Records (HasField (getField))

instance ToJSON a => ToJSVal (Map.Map Text a) where
  toJSVal = toJSVal_aeson

instance ToJSON a => ToJSVal (Map.Map Natural a) where
  toJSVal = toJSVal_aeson

instance ToJSON a => ToJSVal (Map.Map OID a) where
  toJSVal = toJSVal_aeson
instance FromJSVal a => FromJSVal (Map.Map OID a) where
  fromJSVal = doFromJSVal "Map OID a" $ \x -> do
    o <- lift $ makeObject x
    props <- lift $ listProps o
    res <- traverse (extractPair o) props
    pure $ Map.fromList res

extractPair :: FromJSVal a => Object -> JSString -> MaybeT JSM (OID,a)
extractPair o key = do
    val <- lift $ getProp key o
    a <- MaybeT $ fromJSVal val
    pure (OID $ fromJSString key, a)

fromListWithTunniste :: (HasField "tunniste" b a, Ord a) => [b] -> Map a b
fromListWithTunniste = Map.fromList . fmap toPairWithTunniste

toPairWithTunniste :: HasField "tunniste" b a => b -> (a, b)
toPairWithTunniste x = (getField @"tunniste" x, x)



newtype OID = OID {
    oid :: Text
} deriving (Show, Generic, Ord, Eq)
instance ToJSON OID
instance ToJSONKey OID

data FintrafficSystem = Infra | Jeti | Ruma
  deriving (Show, Enum, Bounded, Eq, Read)

instance ToJSVal FintrafficSystem where
    toJSVal = toJSVal . show @Text

instance FromJSVal FintrafficSystem where
    fromJSVal = doFromJSVal "FintrafficSystem" $ \x -> do
        txt <- MaybeT $ fromJSVal x
        hoistMaybe $ find ((== txt) . show @Text) [minBound ..]

data VaylaSystem = Trex
  deriving (Show, Enum, Bounded, Eq)

mkFintrafficSystem :: Natural -> Maybe FintrafficSystem
mkFintrafficSystem 1 = Just Infra
mkFintrafficSystem 2 = Just Jeti
mkFintrafficSystem 7 = Just Ruma
mkFintrafficSystem _ = Nothing

mkVaylaSystem :: Natural -> Maybe VaylaSystem
mkVaylaSystem 1 = Just Trex
mkVaylaSystem _ = Nothing




instance FromJSVal OID where
    fromJSVal = doFromJSVal "OID" $
        fmap OID . MaybeT . fromJSVal

instance ToJSVal OID where
    toJSVal = toJSVal . oid

data SRSName = EPSG3067 | CRS84
    deriving (Show, Generic)

instance FromJSVal SRSName where
    fromJSVal = doFromJSVal "SRSName" $ \x -> do
        srs :: Text <- MaybeT $ fromJSVal x
        case srs of
            "epsg:3067" -> pure EPSG3067
            "crs:84"    -> pure CRS84
            _ -> mzero

data GeometryType = POINT | LINESTRING | POLYGON | MULTIPOINT | MULTILINESTRING | MULTIPOLYGON | GEOMETRYCOLLECTION
  deriving (Show, Read)

instance ToJSVal GeometryType where
    toJSVal = toJSVal . show @Text

data Point = Point {
    longitude :: Int,
    latitude  :: Int
} deriving (Show, Generic)
instance ToJSON Point where
    toJSON Point{..} = toJSON [longitude, latitude]

instance ToJSVal Point where
    toJSVal = toJSVal_aeson

instance FromJSVal Point where
    fromJSVal = doFromJSVal "Point" $ \x -> do
        xs <- MaybeT $ fromJSVal x
        case xs of
            [lon,lat] -> pure $ Point lon lat
            _ -> mzero

newtype LineString = LineString [Point]
  deriving (Show, Generic)
instance ToJSON LineString where
    toJSON (LineString points) = toJSON points
instance FromJSVal LineString where
    fromJSVal = doFromJSVal "LineString" $
        fmap LineString . MaybeT . fromJSVal

newtype MultiLineString = MultiLineString [LineString]
  deriving (Show, Generic)
instance ToJSON MultiLineString where
    toJSON (MultiLineString ls) = toJSON ls
instance FromJSVal MultiLineString where
    fromJSVal = doFromJSVal "MultiLineString" $
        fmap MultiLineString . MaybeT . fromJSVal

data Direction = Inc | Dec
  deriving (Show, Generic)
instance ToJSON Direction where
    toJSON Inc = toJSON @Text "+"
    toJSON Dec = toJSON @Text "-"

instance FromJSVal Direction where
    fromJSVal = doFromJSVal "Direction" $ \x -> do
        y :: Char <- MaybeT $ fromJSVal x
        case y of
            '+' -> pure Inc
            '-' -> pure Dec
            _ -> mzero

instance ToJSVal Direction where
    toJSVal = toJSVal_aeson

-- Distance in meters
newtype Distance = Distance {
    meters :: Natural
} deriving (Show, Generic)
instance ToJSON Distance

instance FromJSVal Distance where
    fromJSVal = doFromJSVal "Distance" $
        fmap Distance . MaybeT . fromJSVal

instance ToJSVal Distance where
    toJSVal = toJSVal_aeson

data Kmetaisyys = Kmetaisyys {
    ratakm :: Natural,
    etaisyys :: Distance
} deriving (Generic, Show)
instance ToJSON Kmetaisyys

instance FromJSVal Kmetaisyys where
    fromJSVal = doFromJSVal "Kmetaisyys" $
      liftA2 Kmetaisyys <$> propFromJSVal "ratakm"
                        <*> propFromJSVal "etaisyys"

instance ToJSVal Kmetaisyys where
    toJSVal = toJSVal_aeson

data Ratakmetaisyys = Ratakmetaisyys {
    ratanumero :: Text,
    kmetaisyys :: Kmetaisyys
} deriving (Generic, Show)
instance ToJSON Ratakmetaisyys

instance FromJSVal Ratakmetaisyys where
    fromJSVal = doFromJSVal "Ratakmetaisyys" $ \x -> do
        r  <- propFromJSVal "ratanumero" x
        km <- propFromJSVal "ratakm" x
        e  <- propFromJSVal "etaisyys" x
        pure $ Ratakmetaisyys r (Kmetaisyys km e)

instance ToJSVal Ratakmetaisyys where
    toJSVal = toJSVal_aeson

data Ratakmvali = Ratakmvali {
    ratanumero :: Text,
    alku :: Kmetaisyys,
    loppu :: Kmetaisyys
} deriving (Generic, Show)
instance ToJSON Ratakmvali

instance FromJSVal Ratakmvali where
    fromJSVal = doFromJSVal "Ratakmvali" $
      liftA3 Ratakmvali <$> propFromJSVal "ratanumero"
                        <*> propFromJSVal "alku"
                        <*> propFromJSVal "loppu"

instance ToJSVal Ratakmvali where
    toJSVal = toJSVal_aeson

data Pmsijainti = Pmsijainti {
    numero :: Natural,
    suunta :: Direction,
    etaisyys :: Distance
} deriving Generic
instance ToJSON Pmsijainti

instance FromJSVal Pmsijainti where
    fromJSVal = doFromJSVal "Pmsijainti" $
      liftA3 Pmsijainti <$> propFromJSVal "numero"
                        <*> propFromJSVal "suunta"
                        <*> propFromJSVal "etaisyys"

instance ToJSVal Pmsijainti where
    toJSVal = toJSVal_aeson

newtype Revision = Revision {
    revisio :: Natural
} deriving (Show, Generic)
instance ToJSON Revision
instance FromJSON Revision
instance FromJSVal Revision where
    fromJSVal = doFromJSVal "Revision" $
        fmap Revision . MaybeT . fromJSVal

data Revisions = Revisions {
    infra :: Revision,
    etj2 :: Revision
} deriving (Show, Generic)
instance ToJSON Revisions
instance FromJSVal Revisions where
    fromJSVal = doFromJSVal "Revisions" $
      liftA2 Revisions <$> propFromJSVal "infra"
                       <*> propFromJSVal "etj2"

instance ToJSVal Revisions where
    toJSVal = toJSVal_aeson

data Train = Train {
    departureDate :: Day,
    trainNumber :: Natural
} deriving (Show,Generic)
instance ToJSON Train

instance ToJSVal Train where
    toJSVal = toJSVal_aeson

instance FromJSVal Train where
    fromJSVal = doFromJSVal "Train" $
        liftA2 Train <$> propFromJSVal "departureDate"
                     <*> propFromJSVal "trainNumber"

data Route = Route {
    start :: Text
  , legs :: [Text]
  , end :: Text
} deriving Generic
instance ToJSON Route

instance ToJSVal Route where
    toJSVal = toJSVal_aeson

instance FromJSVal Route where
    fromJSVal = doFromJSVal "Route" $
        liftA3 Route <$> propFromJSVal "start"
                     <*> propFromJSVal "legs"
                     <*> propFromJSVal "end"